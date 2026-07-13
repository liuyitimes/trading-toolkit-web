import api from './index'

export const hkipoApi = {
  sync() {
    return api.post('/api/v1/hkipo/sync')
  },
  list() {
    return api.get('/api/v1/hkipo/list')
  },
  upcoming() {
    return api.get('/api/v1/hkipo/upcoming')
  },
  summary() {
    return api.get('/api/v1/hkipo/summary')
  },
  detail(code) {
    return api.get(`/api/v1/hkipo/detail/${code}`)
  }
}
