const STATUS = {
  AVAILABLE: '🟢 DISPONIBLE',
  PENDING: '🟡 PENDIENTE DE VALIDACIÓN',
  PAID: '🔴 PAGADA'
}
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf']
}
const DEFAULTS = {
  ticketValue: 50000,
  ticketTotal: 300,
  city: 'Manizales',
  title: 'RIFA HACIENDA TERMALES LA QUINTA',
  gateway: 'manual'
}

function doGet () {
  try {
    const config = readConfig_()
    const sheet = getSheet_('Bilhetes')
    const values = sheet.getDataRange().getDisplayValues()
    const headers = values.shift().map(normalizeKey_)
    const numberIndex = findHeader_(headers, ['boleta', 'ticket', 'numero'])
    const statusIndex = findHeader_(headers, ['estado', 'status'])
    const ticketsStatus = {}
    values.forEach(function (row) {
      if (numberIndex >= 0 && statusIndex >= 0 && row[numberIndex]) {
        ticketsStatus[parseTicketNumber_(row[numberIndex])] = normalizeStatus_(row[statusIndex])
      }
    })
    return json_({ config: getPublicConfig_(config), ticketsStatus: ticketsStatus })
  } catch (error) {
    console.error(error)
    return errorJson_('No fue posible cargar la información de la rifa.')
  }
}

function doPost (event) {
  const lock = LockService.getScriptLock()
  let file = null
  try {
    lock.waitLock(30000)
    const request = parseRequest_(event)
    const config = readConfig_()
    if (config.payment.gateway !== 'manual') throw publicError_('El gateway de pago debe estar configurado como manual.')
    const ticketNumber = validateTicketNumber_(request.ticketNumber, config.ticketTotal)
    const cleanRequest = validateRequest_(request, config.ticketPrice)

    const sheet = getSheet_('Bilhetes')
    const table = readTicketTable_(sheet)
    const ticketRow = table.rows.find(function (row) {
      return parseTicketNumber_(row[table.numberIndex]) === ticketNumber
    })
    if (!ticketRow || ticketRow[table.statusIndex] !== STATUS.AVAILABLE) {
      recordIncident_('Boleta no disponible', cleanRequest, ticketNumber)
      return errorJson_('Esta boleta acaba de ser registrada por otra persona. Comuníquese con La Quinta para verificar su pago y elegir otro número.', 409)
    }

    const folder = getTicketFolder_(config.receiptsFolderId, ticketNumber)
    file = saveReceipt_(folder, cleanRequest.receipt, ticketNumber, cleanRequest.name)
    const now = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyyMMdd HH:mm:ss')
    const rowNumber = ticketRow.rowNumber
    const output = ticketRow.slice()
    output[table.statusIndex] = STATUS.PENDING
    setColumn_(output, table.headers, ['comprador', 'buyer'], cleanRequest.name)
    setColumn_(output, table.headers, ['celular', 'phone', 'telefono'], cleanRequest.phoneNumber)
    setColumn_(output, table.headers, ['comprobante', 'receipt'], file.getId())
    setColumn_(output, table.headers, ['fecha y hora', 'fecha', 'datetime'], now)
    setColumn_(output, table.headers, ['vendedor', 'seller'], cleanRequest.seller)
    sheet.getRange(rowNumber, 1, 1, output.length).setValues([output])
    return json_({ status: STATUS.PENDING, ticketNumber: formatTicketNumber_(ticketNumber) })
  } catch (error) {
    if (file) file.setTrashed(true)
    console.error(error)
    return errorJson_(error.publicMessage || 'No fue posible registrar la boleta.')
  } finally {
    try { lock.releaseLock() } catch (error) {}
  }
}

function readConfig_ () {
  const sheet = getFirstSheet_(['Configuración', 'Configurações'])
  const rows = sheet.getDataRange().getDisplayValues()
  const values = {}
  rows.forEach(function (row) {
    if (row[0]) values[normalizeKey_(row[0])] = row[1] || ''
  })
  const ticketValue = Number(values['valor de la boleta'] || values['ticketprice'] || DEFAULTS.ticketValue)
  const ticketTotal = Number(values['cantidad total de boletas'] || values['tickettotal'] || DEFAULTS.ticketTotal)
  return {
    title: values.titulo || values.título || DEFAULTS.title,
    description: values.descripcion || values.descripción || '',
    ticketPrice: ticketValue,
    ticketTotal: ticketTotal,
    city: values.ciudad || DEFAULTS.city,
    whatsapp: cleanPhone_(values.whatsapp || ''),
    whatsappMessage: values['mensaje de whatsapp'] || '',
    payment: {
      gateway: values['gateway de pago'] || values.gateway || DEFAULTS.gateway,
      holder: values['titular del medio de pago'] || '',
      entity: values['entidad o medio de pago'] || '',
      accountType: values['tipo de cuenta'] || '',
      accountNumber: values['numero de cuenta o llave'] || values['número de cuenta o llave'] || '',
      instructions: values['instrucciones adicionales de pago'] || '',
      qrUrl: values['url de imagen qr'] || ''
    },
    receiptsFolderId: values['id de la carpeta principal de comprobantes'] || ''
  }
}

function getPublicConfig_ (config) {
  return {
    title: config.title,
    description: config.description,
    ticketPrice: config.ticketPrice,
    ticketTotal: config.ticketTotal,
    city: config.city,
    whatsapp: config.whatsapp,
    whatsappMessage: config.whatsappMessage,
    payment: config.payment
  }
}

function validateRequest_ (request, ticketValue) {
  if (!request.name || !request.phoneNumber || !request.confirmed || !request.receipt) throw publicError_('Datos incompletos.')
  if (Number(request.receipt.size) > MAX_RECEIPT_BYTES) throw publicError_('El comprobante no puede superar 5 MB.')
  const allowedExtensions = ALLOWED_RECEIPT_TYPES[request.receipt.type]
  if (!allowedExtensions) throw publicError_('El formato del comprobante no está permitido.')
  const extension = String(request.receipt.name || '').split('.').pop().toLowerCase()
  if (!allowedExtensions.includes(extension)) throw publicError_('La extensión del comprobante no coincide con su formato.')
  if (request.confirmed !== true) throw publicError_('Debe confirmar el pago.')
  if (ticketValue !== 50000) throw publicError_('La configuración del valor de la boleta no es válida.')
  const cleanName = cleanText_(request.name)
  const cleanPhone = cleanPhone_(request.phoneNumber)
  if (cleanName.length < 3) throw publicError_('Ingrese un nombre válido.')
  if (cleanPhone.length < 7 || cleanPhone.length > 15) throw publicError_('Ingrese un número de celular válido.')
  return {
    name: cleanName,
    phoneNumber: cleanPhone,
    seller: cleanText_(request.seller || ''),
    confirmed: true,
    receipt: request.receipt
  }
}

function saveReceipt_ (folder, receipt, ticketNumber, name) {
  const bytes = Utilities.base64Decode(receipt.content || '')
  if (bytes.length === 0 || bytes.length > MAX_RECEIPT_BYTES) throw publicError_('El comprobante no es válido.')
  const extension = normalizeReceiptExtension_(receipt)
  const safeName = cleanText_(name).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'comprador'
  const timestamp = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyyMMdd_HHmmss')
  const blob = Utilities.newBlob(bytes, receipt.type, formatTicketNumber_(ticketNumber) + '_' + safeName + '_' + timestamp + '.' + extension)
  return folder.createFile(blob)
}

function getTicketFolder_ (parentId, ticketNumber) {
  if (!parentId) throw publicError_('La carpeta principal de comprobantes no está configurada.')
  const parent = DriveApp.getFolderById(parentId)
  const name = formatTicketNumber_(ticketNumber)
  const folders = parent.getFoldersByName(name)
  return folders.hasNext() ? folders.next() : parent.createFolder(name)
}

function readTicketTable_ (sheet) {
  const values = sheet.getDataRange().getValues()
  const headers = values.shift().map(normalizeKey_)
  const requiredHeaders = ['boleta', 'estado', 'comprador', 'celular', 'comprobante', 'fecha y hora', 'vendedor', 'validado por', 'fecha de validacion', 'observaciones']
  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) throw publicError_('La estructura de la hoja Bilhetes no es válida. Falta la columna: ' + requiredHeader + '.')
  }
  const numberIndex = findHeader_(headers, ['boleta'])
  const statusIndex = findHeader_(headers, ['estado'])
  return { headers: headers, rows: values.map(function (row, index) { row.rowNumber = index + 2; return row }), numberIndex: numberIndex, statusIndex: statusIndex }
}

function recordIncident_ (reason, request, ticketNumber) {
  const spreadsheet = getSpreadsheet_()
  const sheet = spreadsheet.getSheetByName('Incidencias') || spreadsheet.insertSheet('Incidencias')
  if (sheet.getLastRow() === 0) sheet.appendRow(['Fecha y hora', 'Boleta', 'Motivo', 'Nombre', 'Celular'])
  sheet.appendRow([new Date(), formatTicketNumber_(ticketNumber), reason, safeCell_(request.name), safeCell_(request.phoneNumber)])
}

function getSpreadsheet_ () {
  const properties = PropertiesService.getScriptProperties()
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID')
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId)
  const active = SpreadsheetApp.getActive()
  if (!active) throw publicError_('La hoja de cálculo no está configurada.')
  return active
}
function getSheet_ (name) { return getSpreadsheet_().getSheetByName(name) || getFirstSheet_([name]) }
function getFirstSheet_ (names) { const spreadsheet = getSpreadsheet_(); for (const name of names) { const sheet = spreadsheet.getSheetByName(name); if (sheet) return sheet } throw publicError_('No se encontró la hoja requerida.') }
function parseRequest_ (event) { return JSON.parse(event.postData.contents) }
function validateTicketNumber_ (value, total) { if (!/^\d{3}$/.test(String(value)) || Number(value) < 1 || Number(value) > Math.min(total, 300)) throw publicError_('La boleta no existe.'); return Number(value) }
function parseTicketNumber_ (value) { return Number(String(value).replace(/^0+/, '') || 0) }
function formatTicketNumber_ (value) { return String(value).padStart(3, '0') }
function normalizeReceiptExtension_ (receipt) { return ['jpg', 'jpeg'].includes(String(receipt.name || '').split('.').pop().toLowerCase()) ? 'jpg' : ALLOWED_RECEIPT_TYPES[receipt.type][0] }
function normalizeStatus_ (value) { return [STATUS.AVAILABLE, STATUS.PENDING, STATUS.PAID].includes(value) ? value : STATUS.PENDING }
function normalizeKey_ (value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() }
function findHeader_ (headers, names) { return headers.findIndex(function (header) { return names.includes(header) }) }
function setColumn_ (row, headers, names, value) { const index = findHeader_(headers, names); if (index >= 0) row[index] = safeCell_(value) }
function cleanText_ (value) { return String(value || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 200) }
function cleanPhone_ (value) { return cleanText_(value).replace(/[^0-9]/g, '').slice(0, 20) }
function safeCell_ (value) { const text = cleanText_(value); return /^[=+\-@]/.test(text) ? "'" + text : text }
function publicError_ (message) { const error = new Error(message); error.publicMessage = message; return error }
function json_ (data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON) }
function errorJson_ (message, status) { return json_({ error: true, status: status || 400, message: message }) }
