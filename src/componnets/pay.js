import { formatCurrency, formatTicketNumber } from '../utils.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1])
  reader.onerror = () => reject(new Error('No se pudo leer el comprobante.'))
  reader.readAsDataURL(file)
})

export default {
  props: ['data'],
  data () {
    return {
      name: '',
      phoneNumber: '',
      seller: '',
      receipt: null,
      confirmed: false,
      registering: false,
      error: '',
      submitted: false
    }
  },
  computed: {
    config () {
      return this.data.config
    },
    ticketNumber () {
      return formatTicketNumber(this.data.ticketNumbers[0])
    },
    ticketPrice () {
      return Number(this.config.ticketPrice || this.config.ticketValue || 0)
    },
    payment () {
      return this.config.payment || {}
    },
    formattedPrice () {
      return formatCurrency(this.ticketPrice)
    },
    whatsappMessage () {
      return this.config.whatsappMessage || 'Hola, realicé el pago de la boleta número [ticketNumbers] de la Rifa Hacienda Termales La Quinta. Adjunto el comprobante de pago.'
    }
  },
  methods: {
    onReceiptChange (event) {
      this.error = ''
      const file = event.target.files[0]
      if (!file) {
        this.receipt = null
        return
      }
      const extension = file.name.split('.').pop().toLowerCase()
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(extension) || !ALLOWED_TYPES.includes(file.type)) {
        this.error = 'El comprobante debe ser JPG, JPEG, PNG o PDF.'
        event.target.value = ''
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        this.error = 'El comprobante no puede superar 5 MB.'
        event.target.value = ''
        return
      }
      this.receipt = file
    },
    async register () {
      if (this.registering || !this.receipt || !this.confirmed) return
      if (this.payment.gateway && this.payment.gateway !== 'manual') {
        this.error = 'El medio de pago configurado no está disponible.'
        return
      }
      this.error = ''
      this.registering = true
      try {
        const content = await readFile(this.receipt)
        await this.$rifa.register({
          ticketNumber: this.ticketNumber,
          name: this.name,
          phoneNumber: this.phoneNumber,
          seller: this.seller,
          confirmed: this.confirmed,
          receipt: {
            name: this.receipt.name,
            type: this.receipt.type,
            size: this.receipt.size,
            content
          }
        })
        this.submitted = true
      } catch (error) {
        this.error = error.publicMessage || error.response?.data?.message || 'No fue posible registrar la boleta. Inténtelo nuevamente.'
      } finally {
        this.registering = false
      }
    },
    finish () {
      this.$emit('finished')
    }
  },
  template: `
    <div class="pay">
      <div class="content" v-if="submitted">
        <h2>¡Recibimos su comprobante!</h2>
        <p>La boleta {{ ticketNumber }} quedó pendiente de validación. Una vez verificado el pago quedará confirmado</p>
        <whatsapp-notify v-if="config.whatsapp" :phone-number="config.whatsapp" :ticket-numbers="data.ticketNumbers" :message="whatsappMessage" />
        <button @click="finish()">Finalizar</button>
      </div>
      <form v-else class="content" @submit.prevent="register()">
        <h2>Registrar boleta {{ ticketNumber }}</h2>
        <p><strong>Boleta seleccionada:</strong> {{ ticketNumber }}</p>
        <p><strong>Valor a pagar:</strong> {{ formattedPrice }}</p>
        <hr />
        <p><strong>Titular:</strong> {{ payment.holder || '' }}</p>
        <p><strong>Entidad o medio de pago:</strong> {{ payment.entity || '' }}</p>
        <p v-if="payment.accountType"><strong>Tipo de cuenta:</strong> {{ payment.accountType }}</p>
        <p><strong>Número de cuenta o llave:</strong> {{ payment.accountNumber || '' }}</p>
        <img v-if="payment.qrUrl" :src="payment.qrUrl" alt="Código QR de pago" />
        <p>{{ payment.instructions || 'Realice la transferencia por el valor indicado y adjunte el comprobante para registrar su boleta.' }}</p>
        <div><label>Nombre completo:</label><input v-model.trim="name" required /></div>
        <div><label>Número de celular:</label><input v-model.trim="phoneNumber" required /></div>
        <div><label>¿Quién le compartió la rifa?</label><input v-model.trim="seller" /></div>
        <div><label>Comprobante de pago:</label><input type="file" accept=".jpg,.jpeg,.png,.pdf" required @change="onReceiptChange" /></div>
        <label><input type="checkbox" v-model="confirmed" required /> Confirmo que realicé el pago de {{ formattedPrice }} y que el comprobante adjunto corresponde a esta compra.</label>
        <p v-if="error" class="pay-error">{{ error }}</p>
        <button type="submit" :disabled="registering">{{ registering ? 'Procesando...' : 'Enviar comprobante y registrar mi boleta' }}</button>
        <button type="button" @click="finish()" :disabled="registering">Cancelar</button>
      </form>
    </div>
  `
}
