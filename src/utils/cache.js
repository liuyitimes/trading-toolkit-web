export function getCache(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('缓存写入失败', e)
  }
}

export function removeCache(key) {
  localStorage.removeItem(key)
}

export function clearCache() {
  localStorage.clear()
}
