import api from './index'
import { apiEndpoints, endpointPath } from './contracts'

export const convertibleApi = {
  list(params = {}) {
    const { pageSize, ...query } = params
    if (pageSize !== undefined && query.page_size === undefined) {
      query.page_size = pageSize
    }
    return api.get(apiEndpoints.convertible.list.path, { params: query })
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
