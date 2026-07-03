import { defineStore } from 'pinia'
import { ref } from 'vue'
import { hkipoApi } from '@/api/hkipo'

function safeNum(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def
}

function safeFloatStr(val) {
  const n = parseFloat(val)
  return isNaN(n) ? '' : n.toString()
}

// 估值评级：根据 PE 差值判断
function getPeRating(peDiff) {
  if (peDiff < 0) return { label: '低估', type: 'success' }
  if (peDiff <= 5) return { label: '合理', type: 'warning' }
  return { label: '偏高', type: 'danger' }
}

// 归一化港股 IPO 项：后端蛇形 → 前端驼峰
function normalizeIpoItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const peDiff = safeNum(raw.pe_diff)
  return {
    code: raw.code || '',
    name: raw.name || '--',
    ipoPrice: safeNum(raw.ipo_price),
    applyDate: raw.apply_date || '',
    startDate: raw.apply_date || raw.start_date || '',
    endDate: raw.end_date || raw.apply_date || '',
    listDate: raw.list_date || '',
    winRate: raw.win_rate || '',
    peRatio: raw.pe_ratio || '',
    industryPe: raw.industry_pe || '',
    peDiff,
    peRating: getPeRating(peDiff),
    status: raw.status || _inferStatus(raw),
  }
}

function _inferStatus(item) {
  const hasListDate = item.list_date && item.list_date !== ''
  const hasApplyDate = item.apply_date && item.apply_date !== ''
  if (hasListDate) return 'listed'
  if (hasApplyDate) return 'upcoming'
  return 'pending'
}

export const useHkipoStore = defineStore('hkipo', () => {
  const ipoList = ref([])
  const upcomingList = ref([])
  const summary = ref(null)
  const currentDetail = ref(null)
  const loading = ref(false)

  async function loadIpoList() {
    loading.value = true
    try {
      const data = await hkipoApi.list()
      const arr = Array.isArray(data) ? data : (data.items || [])
      ipoList.value = arr.map(normalizeIpoItem).filter(Boolean)
    } finally {
      loading.value = false
    }
  }

  async function loadUpcoming() {
    loading.value = true
    try {
      const data = await hkipoApi.upcoming()
      const arr = Array.isArray(data) ? data : (data.items || [])
      upcomingList.value = arr.map(normalizeIpoItem).filter(Boolean)
    } finally {
      loading.value = false
    }
  }

  async function loadSummary() {
    try {
      const data = await hkipoApi.summary()
      summary.value = data
    } catch {
      summary.value = null
    }
  }

  async function loadDetail(code) {
    loading.value = true
    try {
      const data = await hkipoApi.detail(code)
      currentDetail.value = normalizeIpoItem(data)
    } finally {
      loading.value = false
    }
  }

  return { ipoList, upcomingList, summary, currentDetail, loading, loadIpoList, loadUpcoming, loadSummary, loadDetail }
})
