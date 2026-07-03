import api from './index'

export const lofApi = {
  list(params) {
    return api.get('/api/v1/lof/list', { params })
  },
  opportunities() {
    return api.get('/api/v1/lof/opportunities')
  },
  summary() {
    return api.get('/api/v1/lof/summary')
  }
}
