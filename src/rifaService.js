import axios from 'axios'

export class Rifa {
  constructor (url, client = axios) {
    this.url = url
    this.client = client
  }

  async retrieve () {
    const response = await this.client.get(this.url)
    if (response.data?.error) {
      const error = new Error(response.data.message || 'No fue posible cargar la rifa.')
      error.publicMessage = response.data.message
      throw error
    }
    return response.data
  }

  async register (data) {
    const response = await this.client.post(this.url, data, {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    if (response.data?.error) {
      const error = new Error(response.data.message || 'No fue posible registrar la boleta.')
      error.publicMessage = response.data.message
      error.status = response.data.status
      throw error
    }
    return response.data
  }
}

export default {
  install: (app, { url }) => {
    const rifa = new Rifa(url)
    app.config.globalProperties.$rifa = rifa
  }
}
