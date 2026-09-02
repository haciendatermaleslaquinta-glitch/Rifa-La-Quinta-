import { formatCurrency } from '../utils'

export default {
  data () {
    return {
      rifa: null,
      reloading: false,
      ticketNumbers: [],
      payData: null,
      loadError: ''
    }
  },
  computed: {
    formattedTicketPrice () {
      return this.rifa ? formatCurrency(this.rifa.config.ticketPrice) : ''
    }
  },
  methods: {
    async reloadRifa () {
      this.reloading = true
      this.loadError = ''
      try {
        const result = await this.$rifa.retrieve()
        if (!result || !result.config || !result.ticketsStatus) throw new Error('Respuesta inválida')
        this.rifa = result
      } catch (error) {
        this.rifa = null
        this.loadError = 'No fue posible cargar las boletas.'
      } finally {
        this.reloading = false
      }
    },
    pay () {
      if (this.ticketNumbers.length !== 1) return
      this.payData = {
        ticketNumbers: this.ticketNumbers,
        config: this.rifa.config
      }
      this.ticketNumbers = []
    },
    selectTicket (value) {
      this.ticketNumbers = value.slice(-1)
    },
    async payFinished () {
      this.payData = null
      await this.reloadRifa()
    }
  },
  async mounted () {
    await this.reloadRifa()
  },
  template: `
    <pay
      v-if="payData"
      :data="payData"
      @finished="payFinished()" />
    <div v-if="rifa === null">
      <p v-if="loadError">{{ loadError }}</p>
      <p v-else>Cargando...</p>
      <button v-if="loadError" @click="reloadRifa()" :disabled="reloading">Reintentar</button>
    </div>
    <div
      v-else
      class="rifa">
      <h1>{{ rifa.config.title }}</h1>
      <p><strong>Valor del boleto:</strong> {{ formattedTicketPrice }}</p>
      <p>{{ rifa.config.description }}</p>
      <p><strong>Selecciona una boleta disponible:</strong></p>
      <div class="tickets">
        <ticket
          v-for="ticketNumber in new Array(rifa.config.ticketTotal).fill().map((_, i) => i+1)"
          :key="ticketNumber"
          :tickets-status="rifa.ticketsStatus"
          :ticket-number="ticketNumber"
          :value="ticketNumber"
          v-model="ticketNumbers"
          @update:model-value="selectTicket" />
      </div>
      <p>
        <button
          @click="reloadRifa()"
          :disabled="reloading">Recargar</button>
      </p>
    </div>
    <pay-action
      v-if="ticketNumbers.length === 1"
      :ticketNumbers="ticketNumbers"
      :ticketPrice="rifa.config.ticketPrice"
      @click="pay()" />
  `
}
