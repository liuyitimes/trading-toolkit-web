import api from './index'
import { apiEndpoints } from './contracts'

export const userApi = {
  login(code) {
    return api.post(apiEndpoints.user.login.path, { code })
  },
  getFavorites() {
    return api.get(apiEndpoints.user.favorites.path)
  }
}
