import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { hkipoApi } from '@/api/hkipo'

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
  return {
    code: raw.code || '',
    name: raw.name || '--',
    applyCode: raw.apply_code || '',
    ipoPrice: safeNum(raw.ipo_price),
    issueTotal: safeNum(raw.issue_total),
    onlineIssue: safeNum(raw.online_issue),
    applyLimit: safeNum(raw.apply_limit),
    topValue: safeNum(raw.top_value),
    applyDate: raw.apply_date || '',
    payDate: raw.pay_date || '',
    listDate: raw.list_date || '',
    winRate: raw.win_rate || '',
    peRatio: raw.pe_ratio || '',
    industryPe: raw.industry_pe || '',
    peDiff,
    peRating: getPeRating(peDiff),
    firstDayGain: raw.first_day_gain || '',
    plateGain: raw.plate_gain || '',
    continuousDays: raw.continuous_days || '',
    status: raw.status || 'pending',
  }
}

export const useHkipoStore = defineStore('hkipo', () => {
  const ipoList = ref([])
  const upcomingList = ref([])
  const summary = ref(null)
  const currentDetail = ref(null)
  const loading = ref(false)

  const upcomingCount = computed(() => summary.value?.upcoming_count ?? 0)
  const recentCount = computed(() => summary.value?.recent_count ?? 0)
  const totalCount = computed(() => summary.value?.total ?? 0)

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

  return {
    ipoList, upcomingList, summary, currentDetail, loading,
    upcomingCount, recentCount, totalCount,
    loadIpoList, loadUpcoming, loadSummary, loadDetail,
  }
})
