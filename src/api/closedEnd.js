import api from './index'
import { apiEndpoints } from './contracts'

export const closedEndApi = {
  list(params) {
    return api.get(apiEndpoints.closedEnd.list.path, { params })
  },
  summary() {
    return api.get(apiEndpoints.closedEnd.summary.path)
  }
}
