import api from './index'

export const marketApi = {
  overview() {
    return api.get('/api/v1/market/overview')
  },
  sentiment() {
    return api.get('/api/v1/market/sentiment')
  },
  fundFlow() {
    return api.get('/api/v1/market/fund-flow')
  }
}
