import api from './index'

export const hkipoApi = {
  list() {
    return api.get('/api/v1/hkipo/list')
  },
  upcoming() {
    return api.get('/api/v1/hkipo/upcoming')
  },
  detail(code) {
    return api.get(`/api/v1/hkipo/detail/${code}`)
  }
}
