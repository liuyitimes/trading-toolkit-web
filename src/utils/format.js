export function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return '--'
  return Number(num).toFixed(decimals)
}

export function formatPercent(num) {
  if (num == null || isNaN(num)) return '--'
  const val = Number(num)
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}

export function formatDate(dateStr, separator = '-') {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${separator}${m}${separator}${day}`
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

export function formatMoney(num) {
  if (num == null || isNaN(num)) return '--'
  if (Math.abs(num) >= 1e8) {
    return (num / 1e8).toFixed(2) + '亿'
  }
  if (Math.abs(num) >= 1e4) {
    return (num / 1e4).toFixed(2) + '万'
  }
  return Number(num).toFixed(2)
}

export function formatColor(num) {
  if (num == null || isNaN(num)) return ''
  if (num > 0) return 'var(--el-color-danger)'
  if (num < 0) return 'var(--el-color-success)'
  return ''
}
