import api from './index'

export const userApi = {
  login(code) {
    return api.post('/api/v1/user/login', { code })
  },
  getFavorites() {
    return api.get('/api/v1/user/favorites')
  },
  toggleFavorite(type, code) {
    return api.post('/api/v1/user/favorites/toggle', { type, code })
  }
}
