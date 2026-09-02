import axios from 'axios'

class Rifa {
  constructor (url) {
    this.url = url
  }

  async retrieve () {
    const response = await axios.get(this.url)
    return response.data
  }

  async register (data) {
    const response = await axios.post(this.url, data, {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    return response.data
  }
}

export default {
  install: (app, { url }) => {
    const rifa = new Rifa(url)
    app.config.globalProperties.$rifa = rifa
  }
}
