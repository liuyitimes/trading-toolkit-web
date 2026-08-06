import api from './index'
import { apiEndpoints, endpointPath } from './contracts'

export const convertibleApi = {
  list(params) {
    return api.get(apiEndpoints.convertible.list.path, { params })
  },
  signals() {
    return api.get(apiEndpoints.convertible.signals.path)
  },
  temperature() {
    return api.get(apiEndpoints.convertible.temperature.path)
  },
  detail(code) {
    return api.get(endpointPath(apiEndpoints.convertible.detail, { code }))
  },
  pending() {
    return api.get(apiEndpoints.convertible.pending.path)
  },
  newListed() {
    return api.get(apiEndpoints.convertible.newListed.path)
  }
}
