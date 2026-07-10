import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { hkipoApi } from '@/api/hkipo'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

function safeNum(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def
}

function getPeRating(peDiff) {
  if (peDiff < 0) return { label: '低估', type: 'success' }
  if (peDiff <= 5) return { label: '合理', type: 'warning' }
  return { label: '偏高', type: 'danger' }
}

function normalizeIpoItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const peDiff = safeNum(raw.pe_diff)
  const ipoPrice = safeNum(raw.ipo_price)
  const applyLimit = safeNum(raw.apply_limit)
  // 一手成本 = 发行价 × 申购上限（万股→股）
  const oneHandCost = ipoPrice > 0 && applyLimit > 0 ? ipoPrice * applyLimit * 10000 : 0
  return {
    code: raw.code || '',
    name: raw.name || '--',
    applyCode: raw.apply_code || '',
    ipoPrice,
    issueTotal: safeNum(raw.issue_total),
    onlineIssue: safeNum(raw.online_issue),
    applyLimit,
    topValue: safeNum(raw.top_value),
    applyDate: raw.apply_date || '',
    payDate: raw.pay_date || '',
    listDate: raw.list_date || '',
    winRate: raw.win_rate != null ? raw.win_rate : '',
    peRatio: raw.pe_ratio != null ? raw.pe_ratio : '',
    industryPe: raw.industry_pe != null ? raw.industry_pe : '',
    peDiff,
    peRating: getPeRating(peDiff),
    firstDayGain: raw.first_day_gain != null ? raw.first_day_gain : '',
    plateGain: raw.plate_gain != null ? raw.plate_gain : '',
    continuousDays: raw.continuous_days != null ? raw.continuous_days : '',
    status: raw.status || 'pending',
    oneHandCost,
    oneHandCostText: oneHandCost > 0 ? (oneHandCost >= 10000 ? (oneHandCost / 10000).toFixed(2) + ' 万' : oneHandCost.toFixed(0) + ' 元') : '--',
    isFavorite: false
  }
}

export const useHkipoStore = defineStore('hkipo', () => {
  const ipoList = ref([])
  const upcomingList = ref([])
  const summary = ref(null)
  const currentDetail = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const tier = 'beginner'
  const threshold = 10000
  const lastUpdated = ref(null)

  const upcomingCount = computed(() => summary.value?.upcoming_count ?? 0)
  const recentCount = computed(() => summary.value?.recent_count ?? 0)
  const totalCount = computed(() => summary.value?.total ?? 0)

  async function loadIpoList() {
    loading.value = true
    try {
      const data = await hkipoApi.list()
      const arr = Array.isArray(data) ? data : (data.items || [])
      ipoList.value = arr.map(normalizeIpoItem).filter(Boolean)
      lastUpdated.value = new Date().toISOString()
      useAppStore().setLastUpdated()
    } catch (e) {
      error.value = e?.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadUpcoming() {
    try {
      const data = await hkipoApi.upcoming()
      const arr = Array.isArray(data) ? data : (data.items || [])
      upcomingList.value = arr.map(normalizeIpoItem).filter(Boolean)
    } catch (e) {
      console.error('加载申购中数据失败:', e)
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

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      const [listResult, upcomingResult, summaryResult] = await Promise.allSettled([
        hkipoApi.list(),
        hkipoApi.upcoming(),
        hkipoApi.summary()
      ])

      if (listResult.status === 'fulfilled') {
        const arr = Array.isArray(listResult.value) ? listResult.value : (listResult.value.items || [])
        ipoList.value = arr.map(normalizeIpoItem).filter(Boolean)
      }
      if (upcomingResult.status === 'fulfilled') {
        const arr = Array.isArray(upcomingResult.value) ? upcomingResult.value : (upcomingResult.value.items || [])
        upcomingList.value = arr.map(normalizeIpoItem).filter(Boolean)
      }
      if (summaryResult.status === 'fulfilled') {
        summary.value = summaryResult.value
      }

      // 兜底：如果 summary 失败，从列表计算
      if (!summary.value) {
        const all = [...ipoList.value, ...upcomingList.value]
        const seen = new Set()
        const unique = all.filter(i => {
          if (seen.has(i.code)) return false
          seen.add(i.code)
          return true
        })
        summary.value = {
          upcoming_count: unique.filter(i => i.status === 'upcoming').length,
          recent_count: unique.filter(i => i.status === 'listed').length,
          total: unique.length
        }
      }

      lastUpdated.value = new Date().toISOString()
      useAppStore().setLastUpdated()
    } catch (err) {
      error.value = err?.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  function refreshFavorites() {
    const userStore = useUserStore()
    const favSet = new Set(userStore.favorites.filter(f => f.type === 'hkipo').map(f => f.code))
    const mark = list => list.map(item => ({ ...item, isFavorite: favSet.has(item.code) }))
    ipoList.value = mark(ipoList.value)
    upcomingList.value = mark(upcomingList.value)
  }

  return {
    ipoList, upcomingList, summary, currentDetail, loading, error,
    upcomingCount, recentCount, totalCount,
    tier, threshold, lastUpdated,
    loadIpoList, loadUpcoming, loadSummary, loadDetail, loadAll, refreshFavorites
  }
})
