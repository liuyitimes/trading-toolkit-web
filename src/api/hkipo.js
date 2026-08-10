import api from './index'
import { apiEndpoints, endpointPath } from './contracts'

export const hkipoApi = {
  sync() {
    return api.post(apiEndpoints.hkipo.sync.path)
  },
  list(params = {}) {
    return api.get(apiEndpoints.hkipo.list.path, { params })
  },
  upcoming(params = {}) {
    return api.get(apiEndpoints.hkipo.upcoming.path, { params })
  },
  summary(params = {}) {
    return api.get(apiEndpoints.hkipo.summary.path, { params })
  },
  detail(code, params = {}) {
    return api.get(endpointPath(apiEndpoints.hkipo.detail, { code }), {
      params
    })
  }
}
