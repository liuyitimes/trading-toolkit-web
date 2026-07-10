import { defineStore } from 'pinia'
import { ref } from 'vue'
import { lofApi } from '@/api/lof'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const PURCHASE_FEE = 0.15

function safeNum(val, def = 0) {
  return typeof val === 'number' && !isNaN(val) ? val : def
}

// 成交额格式化（万元单位）
function formatAmount(amount) {
  if (amount == null || isNaN(amount) || amount <= 0) return { text: '--', level: '', raw: 0 }
  if (amount >= 10000) return { text: (amount / 10000).toFixed(2) + '亿', level: 'safe', raw: amount }
  if (amount >= 1000) return { text: amount.toFixed(2) + '万', level: 'safe', raw: amount }
  if (amount >= 100) return { text: amount.toFixed(2) + '万', level: 'warn', raw: amount }
  if (amount >= 10) return { text: amount.toFixed(2) + '万', level: '', raw: amount }
  return { text: amount.toFixed(0) + '元', level: 'danger', raw: amount }
}

function formatVolume(volume) {
  if (volume == null || isNaN(volume) || volume <= 0) return '--'
  if (volume >= 10000) return (volume / 10000).toFixed(2) + '亿'
  return volume.toFixed(2) + '万'
}

// 生成套利建议文案（移植小程序 _getAdvice 逻辑）
function getAdvice(item) {
  const { premium, limitStatus, consecutivePremium, amountRaw } = item

  if (limitStatus === '暂停') {
    return '申购暂停，无法套利。关注恢复申购后的溢价变化。'
  }

  if (premium >= 3 && amountRaw >= 100) {
    const parts = [`当前溢价 ${premium.toFixed(2)}%，`]
    if (consecutivePremium >= 5) parts.push(`已连续溢价 ${consecutivePremium} 天，`)
    parts.push('成交额充足。')
    if (amountRaw < 1000) parts.push('注意流动性一般，建议 14:50 后操作以降低净值波动风险。')
    parts.push('使用一折券商(申购费 0.15%)可最大化收益。')
    if (limitStatus === '限100') parts.push('单账户限购 100 元，可一拖六账户放大收益。')
    return parts.join('')
  }

  if (premium > 0 && premium < 3) {
    return '溢价较低，不足覆盖申购费(0.15%)，套利空间有限，建议观望。'
  }

  if (premium < 0) {
    if (Math.abs(premium) > 1) {
      return '当前为折价状态。折价套利需持有≥7天（赎回费 0.5%），注意期间净值波动风险，不建议新手参与。'
    }
    return '轻微折价，套利空间有限，建议观望。'
  }

  return '暂无明确套利信号。'
}

// 归一化 LOF 基金项（移植小程序 formatLofItem 逻辑）
function normalizeLofItem(raw) {
  const price = safeNum(raw.price)
  const valuation = safeNum(raw.valuation)
  const premium = safeNum(raw.premium)
  const changePct = safeNum(raw.change_pct)
  const consecutivePremium = raw.consecutive_premium || 0
  const limitStatus = raw.limit_status || '不限'
  const exchange = raw.exchange || ''
  const code = raw.code || ''
  const name = raw.name || '--'

  // 成交额/成交量（后端可能缺失）
  const amountRaw = raw.amount != null ? safeNum(raw.amount) : null
  const volumeRaw = raw.volume != null ? safeNum(raw.volume) : null
  const amountInfo = amountRaw != null ? formatAmount(amountRaw) : { text: '--', level: '', raw: 0 }

  // 价格偏离
  let spread = '--'
  if (valuation > 0) {
    spread = ((price - valuation) / valuation * 100).toFixed(2) + '%'
  }

  // 净溢价（扣申购费 0.15%）
  let netPremium = null
  let netPremiumText = 'N/A'
  let netPremiumClass = ''
  if (limitStatus !== '暂停') {
    netPremium = premium - PURCHASE_FEE
    netPremiumText = (netPremium >= 0 ? '+' : '') + netPremium.toFixed(2) + '%'
    if (netPremium > 3) netPremiumClass = 'high'
    else if (netPremium > 0) netPremiumClass = ''
    else netPremiumClass = 'negative'
  }

  const isPaused = limitStatus === '暂停'
  const isHighlight = premium > 10
  const isHighPremium = premium > 5
  const isChangeUp = changePct > 0
  const changePctText = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%'

  // 套利标记
  const canArbitrage = premium >= 3 && amountInfo.raw >= 100 && !isPaused
  const lowLiquidity = amountInfo.raw > 0 && amountInfo.raw < 10
  const sustainedPremium = consecutivePremium >= 5

  // 申购限额
  let limitAmount = null
  if (limitStatus === '限100') limitAmount = 100

  const item = {
    name,
    code,
    exchange,
    price,
    valuation,
    premium,
    changePct,
    consecutivePremium,
    limitStatus,
    amountRaw: amountInfo.raw,
    priceText: price ? price.toFixed(3) : '--',
    valuationText: valuation ? valuation.toFixed(4) : '--',
    spread,
    premiumText: premium.toFixed(2) + '%',
    premiumValue: premium,
    netPremium,
    netPremiumText,
    netPremiumClass,
    isPaused,
    isHighlight,
    isHighPremium,
    isChangeUp,
    changePctText,
    canArbitrage,
    lowLiquidity,
    sustainedPremium,
    limitAmount,
    amountText: amountInfo.text,
    amountLevel: amountInfo.level,
    volumeText: volumeRaw != null ? formatVolume(volumeRaw) : '--',
    // 预期收益（按1万元申购估算）= 10000 × 净溢价 / 100
    expectedProfit: netPremium != null ? (100 * netPremium).toFixed(0) + '元' : '--',
    isFavorite: false
  }

  item.advice = getAdvice(item)

  return item
}

export const useLofStore = defineStore('lof', () => {
  const fundList = ref([])
  const summary = ref(null)
  const opportunities = ref([])
  const loading = ref(false)
  const error = ref(null)
  const tier = 'beginner'
  const threshold = 10000
  const lastUpdated = ref(null)
  const arbitragePredict = ref(null)
  const arbitrageLoading = ref(false)
  const arbitrageError = ref(null)

  async function loadList(params = {}) {
    loading.value = true
    try {
      const data = await lofApi.list(params)
      fundList.value = (data.items || data || []).map(normalizeLofItem)
    } finally {
      loading.value = false
    }
  }

  async function loadOpportunities() {
    const data = await lofApi.opportunities()
    opportunities.value = data.items || data || []
  }

  async function loadArbitragePredict(code, params = {}) {
    arbitrageLoading.value = true
    arbitrageError.value = null
    try {
      const data = await lofApi.arbitragePredict(code, params)
      arbitragePredict.value = data
    } catch (err) {
      arbitrageError.value = err?.message || '加载失败'
      arbitragePredict.value = null
    } finally {
      arbitrageLoading.value = false
    }
  }

  function clearArbitragePredict() {
    arbitragePredict.value = null
    arbitrageError.value = null
  }

  // 从列表本地计算概览（summary 接口失败时的兜底）
  function computeSummaryFromList(list) {
    if (!list || list.length === 0) return null
    const premiums = list.map(i => i.premium)
    const positiveCount = premiums.filter(p => p > 0).length
    const discountCount = premiums.filter(p => p < 0).length
    const netPremiums = list.filter(i => i.netPremium != null).map(i => i.netPremium)
    const totalAmount = list.reduce((sum, i) => sum + (i.amountRaw || 0), 0)

    // 按板块（交易所）分组统计平均溢价
    const boards = {}
    list.forEach(i => {
      const ex = i.exchange || '其他'
      if (!boards[ex]) boards[ex] = { count: 0, premiumSum: 0 }
      boards[ex].count++
      boards[ex].premiumSum += i.premium
    })
    let topBoard = null
    let topBoardAvg = -Infinity
    for (const [board, stats] of Object.entries(boards)) {
      const avg = stats.premiumSum / stats.count
      if (avg > topBoardAvg) {
        topBoardAvg = avg
        topBoard = board
      }
    }

    return {
      count: list.length,
      premium_avg: premiums.reduce((a, b) => a + b, 0) / premiums.length,
      top_premium: Math.max(...premiums),
      positive_count: positiveCount,
      positive_rate: Math.round(positiveCount / list.length * 1000) / 10,
      discount_count: discountCount,
      sustained_count: list.filter(i => i.sustainedPremium).length,
      limited_count: list.filter(i => i.limitAmount).length,
      paused_count: list.filter(i => i.limitStatus === '暂停').length,
      arbitrage_count: list.filter(i => i.canArbitrage).length,
      avg_net_premium: netPremiums.length > 0 ? netPremiums.reduce((a, b) => a + b, 0) / netPremiums.length : null,
      total_amount: totalAmount,
      top_premium_board: topBoard ? topBoard + '市' : '--',
      top_board_premium_avg: topBoard ? topBoardAvg : null
    }
  }

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      const [listData, summaryResult] = await Promise.allSettled([
        lofApi.list(),
        lofApi.summary()
      ])

      if (listData.status === 'fulfilled') {
        const raw = listData.value.items || listData.value || []
        const normalized = raw.map(normalizeLofItem)
        fundList.value = normalized
        lastUpdated.value = new Date().toISOString()
        useAppStore().setLastUpdated()

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const s = summaryResult.value
          const fallback = computeSummaryFromList(normalized)
          summary.value = {
            count: s.count ?? normalized.length,
            premium_avg: s.premium_avg ?? fallback?.premium_avg ?? '--',
            top_premium: s.top_premium ?? fallback?.top_premium ?? '--',
            positive_count: s.positive_count ?? fallback?.positive_count ?? '--',
            positive_rate: s.positive_rate ?? fallback?.positive_rate ?? '--',
            discount_count: fallback?.discount_count ?? 0,
            sustained_count: fallback?.sustained_count ?? 0,
            limited_count: fallback?.limited_count ?? 0,
            paused_count: s.paused_count ?? fallback?.paused_count ?? '--',
            arbitrage_count: fallback?.arbitrage_count ?? 0,
            avg_net_premium: fallback?.avg_net_premium ?? null,
            total_amount: fallback?.total_amount ?? 0,
            top_premium_board: fallback?.top_premium_board ?? '--',
            top_board_premium_avg: fallback?.top_board_premium_avg ?? null
          }
        } else {
          summary.value = computeSummaryFromList(normalized)
        }
      } else {
        throw listData.reason
      }
    } catch (err) {
      error.value = err?.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  function refreshFavorites() {
    const userStore = useUserStore()
    const favSet = new Set(userStore.favorites.filter(f => f.type === 'lof').map(f => f.code))
    fundList.value = fundList.value.map(item => ({ ...item, isFavorite: favSet.has(item.code) }))
  }

  return {
    fundList, summary, opportunities, loading, error,
    tier, threshold, lastUpdated,
    arbitragePredict, arbitrageLoading, arbitrageError,
    loadList, loadOpportunities, loadAll, refreshFavorites,
    loadArbitragePredict, clearArbitragePredict
  }
})
