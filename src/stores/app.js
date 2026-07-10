import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const isDarkMode = ref(false)
  const showSandbox = ref(false)
  const loading = ref(false)
  const cloudRunUrl = ref('')
  const lastUpdated = ref(null)

  const FALLBACK_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

  function initTheme() {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      isDarkMode.value = saved === 'true'
    } else {
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    document.documentElement.classList.toggle('dark', isDarkMode.value)
  }

  function initCloudRunUrl() {
    const saved = localStorage.getItem('cloudRunUrl')
    cloudRunUrl.value = saved || ''
  }

  function initShowSandbox() {
    const saved = localStorage.getItem('showSandbox')
    showSandbox.value = saved === 'true'
  }

  function toggleShowSandbox() {
    showSandbox.value = !showSandbox.value
    localStorage.setItem('showSandbox', showSandbox.value)
  }

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    document.documentElement.classList.toggle('dark', isDarkMode.value)
    localStorage.setItem('darkMode', isDarkMode.value)
  }

  function setLoading(val) {
    loading.value = val
  }

  function setLastUpdated(time = new Date()) {
    lastUpdated.value = time instanceof Date ? time.toISOString() : time
  }

  function validateUrl(url) {
    if (!url || !url.trim()) return '请输入云托管地址'
    try {
      const u = new URL(url)
      if (!['http:', 'https:'].includes(u.protocol)) {
        return '请输入有效的 HTTP/HTTPS 地址'
      }
      if (!u.hostname) {
        return '请输入有效的域名'
      }
    } catch {
      return '请输入有效的 URL 格式'
    }
    return ''
  }

  function setCloudRunUrl(url) {
    const error = validateUrl(url)
    if (error) return { success: false, error }
    cloudRunUrl.value = url.trim().replace(/\/+$/, '')
    localStorage.setItem('cloudRunUrl', cloudRunUrl.value)
    return { success: true }
  }

  function clearCloudRunUrl() {
    cloudRunUrl.value = ''
    localStorage.removeItem('cloudRunUrl')
  }

  function getEffectiveBaseUrl() {
    return cloudRunUrl.value || FALLBACK_BASE_URL
  }

  return {
    isDarkMode, showSandbox, loading, cloudRunUrl, lastUpdated,
    initTheme, initCloudRunUrl, initShowSandbox, toggleDarkMode, toggleShowSandbox, setLoading, setLastUpdated,
    setCloudRunUrl, clearCloudRunUrl, getEffectiveBaseUrl
  }
})
