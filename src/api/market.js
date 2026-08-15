import api from './index'
import { apiEndpoints } from './contracts'

export const marketApi = {
  overview(params = {}) {
    return api.get(apiEndpoints.market.overview.path, { params })
  },
  sentiment(params = {}) {
    return api.get(apiEndpoints.market.sentiment.path, { params })
  },
  fundFlow(params = {}) {
    return api.get(apiEndpoints.market.fundFlow.path, { params })
  }
}
