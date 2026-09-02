import { formatCurrency, formatTicketNumber } from '../utils.js'

export default {
  props: [
    'ticketNumbers',
    'ticketPrice'
  ],
  computed: {
    totalPriceVerbose () {
      return formatCurrency(this.ticketPrice)
    },
    formattedTicketNumber () {
      return formatTicketNumber(this.ticketNumbers[0])
    }
  },
  emits: ['click'],
  methods: {
    emitClick () {
      this.$emit('click')
    }
  },
  template: `
    <button class="pay-action" type="button" @click="emitClick()">
      <div class="sub">Boleta Nº{{ formattedTicketNumber }} seleccionada</div>
      <div>Continuar con la boleta Nº{{ formattedTicketNumber }} — <strong>{{ totalPriceVerbose }}</strong></div>
    </button>
  `
}
