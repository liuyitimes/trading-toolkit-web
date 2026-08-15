import api from './index'
import { apiEndpoints, endpointPath } from './contracts'

export const lofApi = {
  list(params) {
    return api.get(apiEndpoints.lof.list.path, { params })
  },
  opportunities(params = {}) {
    return api.get(apiEndpoints.lof.opportunities.path, { params })
  },
  summary(params = {}) {
    return api.get(apiEndpoints.lof.summary.path, { params })
  },
  detail(code, params = {}) {
    return api.get(`/api/v1/lof/${code}/detail`, { params })
  },
  shareHistory(code, params = {}) {
    return api.get(endpointPath(apiEndpoints.lof.shareHistory, { code }), {
      params
    })
  },
  arbitragePredict(code, params = {}) {
    return api.get(endpointPath(apiEndpoints.lof.arbitragePredict, { code }), {
      params
    })
  }
}
