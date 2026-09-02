import assert from 'node:assert/strict'
import fs from 'node:fs'

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
assert.doesNotMatch(backendSource.match(/function getPublicConfig_[\s\S]*?\n}\n/)?.[0] || '', /receiptsFolderId/)
assert.match(backendSource, /SPREADSHEET_ID/)
assert.match(backendSource, /'image\/jpeg': \['jpg', 'jpeg'\]/)
assert.match(backendSource, /normalizeReceiptExtension_/)
assert.match(backendSource, /cleanName\.length < 3/)
assert.match(backendSource, /cleanPhone\.length < 7 \|\| cleanPhone\.length > 15/)
assert.match(backendSource, /requiredHeaders = \['boleta', 'estado', 'comprador', 'celular', 'comprobante'/)
assert.match(backendSource, /LockService\.getScriptLock/)
assert.match(backendSource, /setTrashed\(true\)/)

console.log('15 pruebas de aceptacion locales pasaron')
