import api from './index'

export const convertibleApi = {
  list(params) {
    return api.get('/api/v1/convertible/list', { params })
  },
  signals() {
    return api.get('/api/v1/convertible/signals')
  },
  temperature() {
    return api.get('/api/v1/convertible/temperature')
  },
  detail(code) {
    return api.get(`/api/v1/convertible/detail/${code}`)
  },
  pending() {
    return api.get('/api/v1/convertible/pending')
  }
}
