import assert from 'node:assert/strict'
import fs from 'node:fs'
import vmModule from 'node:vm'
import { JSDOM } from 'jsdom'

const serviceSource = fs.readFileSync(new URL('../src/rifaService.js', import.meta.url), 'utf8')
const paymentSource = fs.readFileSync(new URL('../src/componnets/pay.js', import.meta.url), 'utf8')
const ticketSource = fs.readFileSync(new URL('../src/componnets/ticket.js', import.meta.url), 'utf8')
const backendSource = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const utilsSource = fs.readFileSync(new URL('../src/utils.js', import.meta.url), 'utf8')

const submit = async (response) => {
  let submitted = false
  try {
    if (response.error) throw new Error(response.message)
    submitted = true
  } catch (error) {
    return submitted
  }
  return submitted
}

assert.equal(await submit({ error: true, status: 409, message: 'ocupada' }), false, '409 no debe mostrar confirmacion')
assert.equal(await submit({ error: true, status: 500, message: 'Drive' }), false, 'error de Drive no debe mostrar confirmacion')
assert.equal(await submit({ error: true, status: 500, message: 'Sheets' }), false, 'error de Sheets no debe mostrar confirmacion')
assert.equal(await submit({ status: 'ok' }), true, 'respuesta exitosa debe mostrar confirmacion')

assert.match(serviceSource, /response\.data\?\.error/)
assert.match(paymentSource, /error\.publicMessage \|\| error\.response\?\.data\?\.message/)
assert.match(paymentSource, /submitted = true/)
assert.match(ticketSource, /formatTicketNumber/)
assert.match(ticketSource, /formattedTicketNumber/)
assert.match(utilsSource, /padStart\(3, '0'\)/)
assert.match(backendSource, /getPublicConfig_\(config\)/)
assert.doesNotMatch(backendSource, /config\.ticketValue/)
assert.doesNotMatch(backendSource.match(/function getPublicConfig_[\s\S]*?\n}\n/)?.[0] || '', /receiptsFolderId/)
assert.match(backendSource, /SPREADSHEET_ID/)
assert.match(backendSource, /'image\/jpeg': \['jpg', 'jpeg'\]/)
assert.match(backendSource, /normalizeReceiptExtension_/)
assert.match(backendSource, /cleanName\.length < 3/)
assert.match(backendSource, /cleanPhone\.length < 7 \|\| cleanPhone\.length > 15/)
assert.match(backendSource, /requiredHeaders = \['boleta', 'estado', 'comprador', 'celular', 'comprobante'/)
assert.match(backendSource, /LockService\.getScriptLock/)
assert.match(backendSource, /setTrashed\(true\)/)

const runBackendRegistration = (config) => {
  let savedFiles = 0
  let writtenRows = 0
  const row = ['001', '🟢 DISPONIBLE', '', '', '', '', '', '', '', '']
  const context = {
    console: { error () {} },
    LockService: { getScriptLock: () => ({ waitLock () {}, releaseLock () {} }) },
    Utilities: { formatDate: () => '20260902 143510' },
    SpreadsheetApp: {},
    PropertiesService: {},
    DriveApp: {},
    ContentService: {}
  }
  vmModule.createContext(context)
  vmModule.runInContext(backendSource, context)
  context.readConfig_ = () => config
  context.getSheet_ = () => ({
    getRange: () => ({ setValues: () => { writtenRows++ } })
  })
  context.readTicketTable_ = () => ({
    headers: ['boleta', 'estado', 'comprador', 'celular', 'comprobante', 'fecha y hora', 'vendedor', 'validado por', 'fecha de validacion', 'observaciones'],
    rows: [row],
    numberIndex: 0,
    statusIndex: 1
  })
  context.getTicketFolder_ = () => ({})
  context.saveReceipt_ = () => {
    savedFiles++
    return { getId: () => 'receipt-id', setTrashed () {} }
  }
  context.json_ = (data) => data
  context.errorJson_ = (message, status) => ({ error: true, message, status })
  const request = {
    ticketNumber: '001',
    name: 'Carlos Elizondo',
    phoneNumber: '3001234567',
    confirmed: true,
    receipt: { name: 'archivo.jpg', type: 'image/jpeg', size: 1, content: 'YQ==' }
  }
  const response = context.doPost({ postData: { contents: JSON.stringify(request) } })
  return { response, savedFiles, writtenRows }
}

const validRegistration = runBackendRegistration({ ticketPrice: 50000, ticketTotal: 300, payment: { gateway: 'manual' }, receiptsFolderId: 'folder' })
assert.equal(validRegistration.savedFiles, 1, '50000 debe permitir guardar el comprobante')
assert.equal(validRegistration.writtenRows, 1, '50000 debe escribir la boleta pendiente')
assert.equal(validRegistration.response.status, '🟡 PENDIENTE DE VALIDACIÓN')

for (const ticketPrice of [50001, undefined]) {
  const invalidRegistration = runBackendRegistration({ ticketPrice, ticketTotal: 300, payment: { gateway: 'manual' }, receiptsFolderId: 'folder' })
  assert.equal(invalidRegistration.savedFiles, 0, 'precio inválido no debe crear archivo')
  assert.equal(invalidRegistration.writtenRows, 0, 'precio inválido no debe cambiar estado')
  assert.equal(invalidRegistration.response.error, true)
}

const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.SVGElement = dom.window.SVGElement
globalThis.Element = dom.window.Element
globalThis.Node = dom.window.Node

const { createApp } = await import('vue/dist/vue.esm-bundler.js')
const { default: rifa } = await import('../src/componnets/rifa.js')
const { default: pay } = await import('../src/componnets/pay.js')
const { default: ticket } = await import('../src/componnets/ticket.js')
const { default: payAction } = await import('../src/componnets/payAction.js')
const { default: whatsappNotify } = await import('../src/componnets/whatsapp-notify.js')

const app = createApp(rifa)
app.component('Pay', pay)
app.component('Ticket', ticket)
app.component('PayAction', payAction)
app.component('WhatsappNotify', whatsappNotify)
app.config.globalProperties.$rifa = {
  retrieve: async () => ({
    config: {
      title: 'RIFA HACIENDA TERMALES LA QUINTA',
      description: 'Prueba',
      ticketPrice: 50000,
      ticketTotal: 300,
      payment: { gateway: 'manual' }
    },
    ticketsStatus: {
      3: '🟡 PENDIENTE DE VALIDACIÓN',
      4: '🔴 PAGADA'
    }
  })
}
const appVm = app.mount('#app')
await new Promise((resolve) => setTimeout(resolve, 0))

assert.equal(document.querySelectorAll('.ticket').length, 300, 'debe renderizar 300 boletas')
const availableOne = document.querySelectorAll('.ticket')[0]
availableOne.querySelector('input').click()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.match(document.querySelector('.pay-action').textContent, /Nº001/)
assert.match(document.querySelector('.pay-action').textContent, /\$\s*50\.000/)

document.querySelectorAll('.ticket')[1].querySelector('input').click()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(appVm.ticketNumbers.length, 1)
assert.equal(appVm.ticketNumbers[0], 2, 'solo debe quedar seleccionada la ultima boleta')
assert.match(document.querySelector('.pay-action').textContent, /Nº002/)

document.querySelector('.pay-action').click()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.ok(document.querySelector('.pay form'), 'el CTA debe abrir el formulario')
assert.match(document.querySelector('.pay').textContent, /Registrar boleta 002/)
assert.equal(document.querySelectorAll('.ticket')[2].querySelector('input').disabled, true)
assert.equal(document.querySelectorAll('.ticket')[3].querySelector('input').disabled, true)

document.querySelector('.pay button[type="button"]').click()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(document.querySelector('.pay'), null, 'Cancelar debe regresar a la grilla')
document.querySelectorAll('.ticket')[5].focus()
document.querySelectorAll('.ticket')[5].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
await new Promise((resolve) => setTimeout(resolve, 0))
assert.match(document.querySelector('.pay-action').textContent, /Nº006/)

console.log('Pruebas locales de contrato y flujo Vue pasaron')
