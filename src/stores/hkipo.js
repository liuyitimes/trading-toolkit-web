import { defineStore } from 'pinia'
import { ref } from 'vue'
import { hkipoApi } from '@/api/hkipo'

function safeNum(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def
}

// 归一化港股 IPO 项：后端蛇形 → 前端驼峰
function normalizeIpoItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    code: raw.code || '',
    name: raw.name || '--',
    ipoPrice: safeNum(raw.ipo_price),
    priceRange: raw.price_range || '',
    lotSize: safeNum(raw.lot_size),
    applyDate: raw.apply_date || '',
    startDate: raw.apply_date || raw.start_date || '',
    endDate: raw.end_date || raw.apply_date || '',
    listDate: raw.list_date || '',
    firstDayReturn: safeNum(raw.first_day_return),
    currentPrice: safeNum(raw.current_price),
    winRate: raw.win_rate || '',
    peRatio: raw.pe_ratio || '',
    industryPe: raw.industry_pe || '',
    // 状态判定
    status: raw.status || _inferStatus(raw),
    darkTrade: raw.dark_trade || null,
  }
}

function _inferStatus(item) {
  // 根据字段推断状态
  const hasListDate = item.list_date && item.list_date !== ''
  const hasApplyDate = item.apply_date && item.apply_date !== ''
  if (hasListDate) return 'listed'
  if (hasApplyDate) return 'upcoming'
  return 'pending'
}

export const useHkipoStore = defineStore('hkipo', () => {
  const ipoList = ref([])
  const upcomingList = ref([])
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

  async function loadDetail(code) {
    loading.value = true
    try {
      const data = await hkipoApi.detail(code)
      currentDetail.value = normalizeIpoItem(data)
    } finally {
      loading.value = false
    }
  }

  return { ipoList, upcomingList, currentDetail, loading, loadIpoList, loadUpcoming, loadDetail }
})
