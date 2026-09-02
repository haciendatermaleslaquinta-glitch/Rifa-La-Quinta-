export default {
  props: [
    'ticketNumbers',
    'ticketPrice'
  ],
  computed: {
    totalPriceVerbose () {
      return (this.ticketNumbers.length * this.ticketPrice).toFixed(2).replace('.', ',')
    }
  },
  template: `
    <button class="pay-action">
      <div class="sub">{{ ticketNumbers.length }} boletos seleccionados</div>
      <div>Paga <strong>R\${{ totalPriceVerbose }}</strong></div>
    </button>
  `
}
