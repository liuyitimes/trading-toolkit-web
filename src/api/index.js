import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000 // 后端数据源（新浪/东财）响应较慢，给足 60 秒
})

api.interceptors.request.use(config => {
  const customUrl = localStorage.getItem('cloudRunUrl')
  if (customUrl) {
    config.baseURL = customUrl.replace(/\/+$/, '')
  }
  return config
})

api.interceptors.response.use(
  response => {
    const body = response.data
    // 后端统一信封 { success, data, meta }，解包到内层 data
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) return body.data
      const msg = body.error?.message || '请求失败'
      ElMessage.error(msg)
      return Promise.reject(new Error(msg))
    }
    return body
  },
  error => {
    const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default api
