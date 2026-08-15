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
  signals(params = {}) {
    return api.get(apiEndpoints.convertible.signals.path, { params })
  },
  temperature(params = {}) {
    return api.get(apiEndpoints.convertible.temperature.path, { params })
  },
  detail(code, params = {}) {
    return api.get(endpointPath(apiEndpoints.convertible.detail, { code }), {
      params
    })
  },
  pending(params = {}) {
    return api.get(apiEndpoints.convertible.pending.path, { params })
  },
  newListed(params = {}) {
    return api.get(apiEndpoints.convertible.newListed.path, { params })
  }
}
