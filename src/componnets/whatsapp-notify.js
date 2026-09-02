import { formatTicketNumber } from '../utils.js'

export const DEFAULT_MESSAGE = 'Hola, realicé el pago de la boleta número [ticketNumbers] de la Rifa Hacienda Termales La Quinta. Adjunto el comprobante de pago.'

export default {
  props: [
    'phoneNumber',
    'message',
    'ticketNumbers'
  ],
  computed: {
    uri () {
      const params = new URLSearchParams()
      const text = (this.message || DEFAULT_MESSAGE).replaceAll('[ticketNumbers]', formatTicketNumber(this.ticketNumbers[0]))
      params.set('text', text)
      return `https://wa.me/${this.phoneNumber}?${params.toString()}`
    }
  },
  template: `
  <div class="whatsapp-notify">
    <p><strong>¡Gracias por participar!</strong></p>
    <p>¡Mucha suerte! 🍀</p>
  </div>
`
}
