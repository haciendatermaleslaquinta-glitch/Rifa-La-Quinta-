import { formatTicketNumber } from '../utils'

const PENDING = '🟡 PENDIENTE DE VALIDACIÓN'
const AVAILABLE = '🟢 DISPONIBLE'
const PAID = '🔴 PAGADA'
const TICKET_CLASS_MAP = {
  [PENDING]: 'not-paid',
  [PAID]: 'paid',
  [AVAILABLE]: 'available'
}
const TICKET_STATUS_TITLE_MAP = {
  [PENDING]: PENDING,
  [PAID]: PAID,
  [AVAILABLE]: AVAILABLE
}

export default {
  props: [
    'modelValue',
    'value',
    'ticketsStatus',
    'ticketNumber'
  ],
  computed: {
    formattedTicketNumber () {
      return formatTicketNumber(this.ticketNumber)
    },
    checked: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      }
    },
    status () {
      const status = this.ticketsStatus[this.ticketNumber]
      if (!status) {
        return AVAILABLE
      }
      return status
    },
    statusTitle () {
      return TICKET_STATUS_TITLE_MAP[this.status]
    },
    statusClass () {
      return TICKET_CLASS_MAP[this.status]
    },
    checkedClass () {
      return this.checked.includes(this.value) ? 'checked' : 'non-checked'
    },
    disabled () {
      return this.status !== AVAILABLE
    }
  },
  template: `
    <label :class="['ticket', statusClass, checkedClass]">
      <input
        type="checkbox"
        :disabled="disabled"
        v-model="checked"
        :value="value" />
      <div>Nº{{ formattedTicketNumber }}</div>
      <div><strong>{{ statusTitle }}</strong></div>
    </label>
  `
}
