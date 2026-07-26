import api from './index'
import { apiEndpoints, endpointPath } from './contracts'

export const hkipoApi = {
  sync() {
    return api.post(apiEndpoints.hkipo.sync.path)
  },
  list() {
    return api.get(apiEndpoints.hkipo.list.path)
  },
  upcoming() {
    return api.get(apiEndpoints.hkipo.upcoming.path)
  },
  summary() {
    return api.get(apiEndpoints.hkipo.summary.path)
  },
  detail(code) {
    return api.get(endpointPath(apiEndpoints.hkipo.detail, { code }))
  }
}
