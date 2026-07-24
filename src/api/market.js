import api from './index'
import { apiEndpoints } from './contracts'

export const marketApi = {
  overview() {
    return api.get(apiEndpoints.market.overview.path)
  },
  sentiment() {
    return api.get(apiEndpoints.market.sentiment.path)
  },
  fundFlow() {
    return api.get(apiEndpoints.market.fundFlow.path)
  }
}
