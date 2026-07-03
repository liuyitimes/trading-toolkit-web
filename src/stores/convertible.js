import { defineStore } from 'pinia'
import { ref } from 'vue'
import { convertibleApi } from '@/api/convertible'
import { marketApi } from '@/api/market'
import { useUserStore } from '@/stores/user'

// 交易所判定
function detectExchange(stockCode = '', bondCode = '') {
  if (stockCode.startsWith('6') || stockCode.startsWith('5') || stockCode.startsWith('9')
    || bondCode.startsWith('11') || bondCode.startsWith('13') || bondCode.startsWith('5')) return '沪'
  if (stockCode.startsWith('0') || stockCode.startsWith('1') || stockCode.startsWith('2') || stockCode.startsWith('3')
    || bondCode.startsWith('12') || bondCode.startsWith('16')) return '深'
  if (stockCode.startsWith('4') || stockCode.startsWith('8') || bondCode.startsWith('8')) return '京'
  return ''
}

const ALL_STAGES = ['董事会预案', '股东大会批准', '交易所受理', '上市委通过', '同意注册', '申购中', '待上市']

const SECTOR_KEYWORDS = [
  { sector: 'AI/人工智能', keywords: ['智能', '科技', '信息', '数据', '软件', 'AI', '数字'], hot: true },
  { sector: '新能源', keywords: ['新能源', '光伏', '风电', '电池', '锂电'], hot: true },
  { sector: '半导体/芯片', keywords: ['半导', '芯片', '微电', '电子'], hot: true },
  { sector: '医药生物', keywords: ['医药', '生物', '医疗', '药'], hot: true },
  { sector: '低空经济', keywords: ['低空', '无人机', '航空'], hot: true },
  { sector: '消费', keywords: ['消费', '食品', '饮料', '家电'], hot: false },
  { sector: '金融', keywords: ['银行', '证券', '保险', '金融'], hot: false },
  { sector: '汽车', keywords: ['汽车', '车', '电动'], hot: false },
  { sector: '机械/制造', keywords: ['机械', '装备', '制造', '精密'], hot: false },
  { sector: '化工/材料', keywords: ['化工', '材料', '化学', '化纤'], hot: false }
]

function detectSector(stockName = '') {
  for (const entry of SECTOR_KEYWORDS) {
    if (entry.keywords.some(kw => stockName.includes(kw))) {
      return { sectorTag: entry.sector, isHotSector: entry.hot }
    }
  }
  return { sectorTag: '--', isHotSector: false }
}

// 安全垫计算（百元含权兜底公式）
function computeSafetyPad(perShareAlloc, stockPriceVal, sharesFor10Val, premiumRate = 0.2) {
  const safeSharesFor10 = sharesFor10Val || 0
  const safePrice = stockPriceVal || 0
  if (safeSharesFor10 <= 0 || safePrice <= 0) return { value: 0, profit: 0 }
  const expectedProfit = 1000 * (premiumRate || 0.2)
  return {
    value: expectedProfit / (safeSharesFor10 * safePrice) * 100,
    profit: expectedProfit
  }
}

// 归一化信号项（已上市转债）
function normalizeBondItem(item) {
  const priceNum = typeof item.price === 'number' ? item.price : 0
  const conversionValueNum = typeof item.conversion_value === 'number' ? item.conversion_value : 0
  const premiumRateNum = typeof item.premium_rate === 'number' ? item.premium_rate : 0
  const doubleLowNum = typeof item.double_low === 'number' ? item.double_low : 0
  const conversionPriceNum = typeof item.conversion_price === 'number' ? item.conversion_price : 0
  const stockPriceNum = typeof item.stock_price === 'number' ? item.stock_price : 0
  const pureBondValueNum = typeof item.pure_bond_value === 'number' ? item.pure_bond_value : 0
  const ytmNum = typeof item.ytm === 'number' ? item.ytm : null
  const rating = item.rating || '--'

  const bondCode = item.bond_code || item.bondCode || '--'
  const stockCode = String(item.stock_code || '')
  const exchange = item.exchange || detectExchange(stockCode, bondCode)

  let forceRedemptionGap = '--'
  let forceRedemptionClass = ''
  let _forcePriceGap = 9999
  if (conversionPriceNum > 0 && stockPriceNum > 0) {
    const forcePrice = conversionPriceNum * 1.3
    const gap = (stockPriceNum - forcePrice) / forcePrice * 100
    _forcePriceGap = gap
    forceRedemptionGap = (gap > 0 ? '+' : '') + gap.toFixed(1) + '%'
    forceRedemptionClass = gap >= 0 ? 'warning' : ''
  }

  let downReviseGap = '--'
  let downReviseClass = ''
  let _revisePriceGap = 9999
  if (conversionPriceNum > 0 && stockPriceNum > 0) {
    const revisePrice = conversionPriceNum * 0.85
    const gap = (stockPriceNum - revisePrice) / revisePrice * 100
    _revisePriceGap = gap
    downReviseGap = gap.toFixed(1) + '%'
    downReviseClass = gap < 0 ? 'warning' : ''
  }

  let discountSpace = '--'
  let discountClass = ''
  if (premiumRateNum < 0) {
    discountSpace = Math.abs(premiumRateNum).toFixed(2) + '%'
    discountClass = 'positive'
  }

  const hundredRightValue = item.hundred_right || null
  const lotStockCount = item.lot_stock_count || null
  const safetyPadValue = item.safety_pad || null

  return {
    bondName: item.bond_name || '--',
    bondCode,
    stockName: item.stock_name || '--',
    stockCode,
    exchange,
    price: priceNum ? priceNum.toFixed(2) : '--',
    priceNum,
    conversionValue: conversionValueNum ? conversionValueNum.toFixed(2) : '--',
    conversionValueNum,
    premium: premiumRateNum !== 0 || item.premium_rate !== undefined ? premiumRateNum.toFixed(2) + '%' : '--',
    premiumClass: premiumRateNum < 0 ? 'negative' : premiumRateNum > 30 ? 'high' : '',
    premiumNum: premiumRateNum,
    doubleLow: doubleLowNum ? doubleLowNum.toFixed(1) : '--',
    doubleLowNum,
    conversionPrice: conversionPriceNum ? conversionPriceNum.toFixed(2) : '--',
    conversionPriceNum,
    stockPrice: stockPriceNum ? stockPriceNum.toFixed(2) : '--',
    stockPriceNum,
    pureBondValue: pureBondValueNum ? pureBondValueNum.toFixed(2) : '--',
    ytm: ytmNum !== null ? (ytmNum > 0 ? '+' : '') + ytmNum.toFixed(2) + '%' : '--',
    rating,
    forceRedemptionGap,
    forceRedemptionClass,
    _forcePriceGap,
    downReviseGap,
    downReviseClass,
    _revisePriceGap,
    discountSpace,
    discountClass,
    hundredRight: hundredRightValue ? hundredRightValue.toFixed(2) : '--',
    lotStock: lotStockCount ? lotStockCount + '股' : '--',
    safetyPad: safetyPadValue ? safetyPadValue.toFixed(1) + '%' : '--',
    isFavorite: false,
    rawPremium: premiumRateNum
  }
}

// 归一化待发/配售项
function normalizePendingItem(item) {
  if (!item || typeof item !== 'object') return null
  const stockName = item.stock_name || '--'
  const stockCode = item.stock_code || '--'
  const bondCode = item.bond_code || ''
  const bondName = item.bond_name || ''
  const status = item.status || '--'
  const progress = item.progress || status
  const issueSize = item.issue_size || 0
  const rating = item.rating || ''
  const shareholderRatio = item.shareholder_ratio || 0
  const stockPrice = item.stock_price || 0
  const stockChange = item.stock_change || 0
  const conversionPrice = item.conversion_price || 0
  const pb = item.pb || 0
  const perShare = item.per_share_allocation || 0
  const sharesFor10 = item.shares_for_10_lots || 0
  const regDate = item.registration_date || ''
  const onlineIssueSize = item.online_issue_size || 0
  const winRate = item.win_rate || 0

  // 百元含权：优先后端 stock_cash_ratio，兜底自算
  const cashRatio = item.stock_cash_ratio || (perShare && stockPrice ? Math.round(perShare / stockPrice * 10000) / 100 : 0)

  const riskLevel = item.risk_level || 'mid'
  const recordPrice = item.record_price || 0
  const ma20Price = item.ma20_price || 0

  // 安全垫
  const _safetyPadValue = item.safety_pad > 0
    ? item.safety_pad
    : computeSafetyPad(perShare, stockPrice, sharesFor10, 0.2).value
  const expectedProfit = item.expected_profit > 0
    ? item.expected_profit
    : computeSafetyPad(perShare, stockPrice, sharesFor10, 0.2).profit

  // 正股趋势（相对20日均价偏离）
  const stockTrend = ma20Price > 0 ? Math.round((stockPrice - ma20Price) / ma20Price * 10000) / 100 : 0

  const exchange = detectExchange(stockCode, bondCode)

  // 登记日徽标
  const today = new Date().toISOString().slice(0, 10)
  let regBadge = ''
  let regBadgeClass = ''
  if (regDate) {
    if (regDate === today) { regBadge = '今日登记'; regBadgeClass = 'hot' }
    else if (regDate > today) {
      const diff = Math.ceil((new Date(regDate) - new Date()) / 86400000)
      if (diff === 1) { regBadge = '明日登记'; regBadgeClass = 'warm' }
      else if (diff <= 3) { regBadge = diff + '天后登记'; regBadgeClass = 'warm' }
    }
  }

  // 一手党标记（沪市+配10张市值<10000元）
  const oneHandParty = exchange === '沪' && sharesFor10 > 0 && stockPrice > 0 && (sharesFor10 * stockPrice) < 10000
  const _costFor10LotsRaw = sharesFor10 > 0 && stockPrice > 0 ? sharesFor10 * stockPrice : 0
  const _oneHandMinShares = exchange === '沪' && sharesFor10 > 0 && stockPrice > 0 ? Math.ceil(sharesFor10 * 0.6) : 0

  const riskLabel = riskLevel === 'high' ? '高风险' : riskLevel === 'low' ? '低风险' : '中风险'

  // 综合排序分（百元含权50% + 安全垫30% + 发行规模20%）
  const _compositeRankRaw = Math.round(
    Math.min(cashRatio / 30, 1) * 50 +
    Math.min(_safetyPadValue / 10, 1) * 30 +
    Math.max(0, Math.min((10 - issueSize) / 8, 1)) * 20
  )

  // 发行时间轴
  let currentStageIndex = 0
  if (status && status !== '--') {
    const idx = ALL_STAGES.indexOf(status)
    if (idx >= 0) currentStageIndex = idx
  }
  const stageList = ALL_STAGES.map((name, i) => ({
    name,
    status: i < currentStageIndex ? 'done' : i === currentStageIndex ? 'current' : 'pending'
  }))

  const { sectorTag, isHotSector } = detectSector(stockName)

  return {
    stockName, stockCode, exchange,
    stockPrice: stockPrice ? stockPrice.toFixed(2) : '--',
    stockChange: stockChange ? (stockChange >= 0 ? '+' : '') + stockChange.toFixed(2) + '%' : '--',
    stockChangeUp: stockChange >= 0,
    _stockChangeRaw: stockChange,
    bondName: bondName || '--',
    bondCode: bondCode || '--',
    progress, _status: status,
    issueSize: issueSize ? issueSize.toFixed(2) + '亿' : '--',
    _issueSizeRaw: issueSize,
    rating: rating || '--',
    shareholderRatio: shareholderRatio ? shareholderRatio.toFixed(1) + '%' : '--',
    conversionPrice: conversionPrice ? conversionPrice.toFixed(2) : '--',
    pb: pb ? pb.toFixed(2) : '--',
    cashRatio: cashRatio ? cashRatio.toFixed(2) + '元' : '--',
    _cashRatioRaw: cashRatio,
    perShare: perShare ? perShare.toFixed(4) + '元' : '--',
    sharesFor10: sharesFor10 ? sharesFor10 + '股' : '--',
    _sharesFor10Raw: sharesFor10,
    costFor10Lots: _costFor10LotsRaw > 0 ? Math.round(_costFor10LotsRaw) + '元' : '--',
    _costFor10LotsRaw,
    _oneHandMinShares,
    oneHandMinCost: _oneHandMinShares > 0 ? Math.round(_oneHandMinShares * stockPrice) + '元' : '',
    regDate: regDate || '--',
    regBadge, regBadgeClass,
    onlineIssueSize: onlineIssueSize ? onlineIssueSize.toFixed(2) + '亿' : '--',
    winRate: winRate ? (winRate * 100).toFixed(3) + '%' : '--',
    riskLevel,
    riskLabel,
    riskClass: riskLevel,
    expectedProfit: Math.round(expectedProfit) + '元',
    _expectedProfitRaw: expectedProfit,
    stockTrend: stockTrend !== 0 ? (stockTrend >= 0 ? '+' : '') + stockTrend.toFixed(2) + '%' : '--',
    _stockTrendRaw: stockTrend,
    recordPrice: recordPrice ? recordPrice.toFixed(2) : '--',
    oneHandParty,
    safetyPad: _safetyPadValue > 0 ? _safetyPadValue.toFixed(2) + '%' : '--',
    _safetyPadRaw: _safetyPadValue,
    _compositeRankRaw,
    progressClass: progress.includes('申购') || progress.includes('上市') ? 'hot' : 'warm',
    stageDot: status === '申购中' || status === '待上市' ? 'dot-final'
      : status === '同意注册' || status === '上市委通过' ? 'dot-mid'
        : status === '交易所受理' ? 'dot-early' : 'dot-first',
    detail: {
      stockName, stockCode,
      bondName: bondName || '暂无', bondCode: bondCode || '暂无',
      progress, status,
      regDate: regDate || '暂无',
      issueSize: issueSize ? issueSize.toFixed(2) + '亿元' : '暂无',
      rating: rating || '暂无',
      shareholderRatio: shareholderRatio ? shareholderRatio.toFixed(1) + '%' : '暂无',
      conversionPrice: conversionPrice ? conversionPrice.toFixed(2) + '元' : '暂无',
      stockPrice: stockPrice ? stockPrice.toFixed(2) + '元' : '暂无',
      stockChange: stockChange ? (stockChange >= 0 ? '+' : '') + stockChange.toFixed(2) + '%' : '暂无',
      pb: pb ? pb.toFixed(2) : '暂无',
      cashRatio: cashRatio ? cashRatio.toFixed(2) + '元/百元' : '暂无',
      perShare: perShare ? perShare.toFixed(4) + '元' : '暂无',
      sharesFor10: sharesFor10 ? sharesFor10 + '股' : '暂无',
      onlineIssueSize: onlineIssueSize ? onlineIssueSize.toFixed(2) + '亿元' : '暂无',
      winRate: winRate ? (winRate * 100).toFixed(3) + '%' : '暂无',
      riskLevel, riskLabel, riskClass: riskLevel,
      safetyPad: _safetyPadValue > 0 ? _safetyPadValue.toFixed(2) + '%' : '暂无',
      _safetyPadRaw: _safetyPadValue,
      expectedProfit: expectedProfit > 0 ? Math.round(expectedProfit) + '元' : '暂无',
      _expectedProfitRaw: expectedProfit,
      stockTrend: stockTrend !== 0 ? (stockTrend >= 0 ? '+' : '') + stockTrend.toFixed(2) + '%' : '暂无',
      _stockTrendRaw: stockTrend,
      recordPrice: recordPrice ? recordPrice.toFixed(2) + '元' : '暂无',
      ma20Price: ma20Price ? ma20Price.toFixed(2) + '元' : '暂无',
      stageList,
      sectorTag,
      isHotSector
    }
  }
}

// 信号列表按各 Tab 最优排序
function sortByBest(list, tabKey) {
  if (!list || list.length <= 1) return list || []
  return [...list].sort((a, b) => {
    if (tabKey === 'double_low') return (a.doubleLowNum || 9999) - (b.doubleLowNum || 9999)
    if (tabKey === 'force_redeem') return Math.abs(a._forcePriceGap || 9999) - Math.abs(b._forcePriceGap || 9999)
    if (tabKey === 'discount') return (a.premiumNum || 999) - (b.premiumNum || 999)
    if (tabKey === 'down_revised') return Math.abs(a._revisePriceGap || 9999) - Math.abs(b._revisePriceGap || 9999)
    return 0
  })
}

function emptySignals() {
  return { placement: [], double_low: [], force_redeem: [], discount: [], down_revised: [] }
}

export const useConvertibleStore = defineStore('convertible', () => {
  const bondList = ref([])
  const signals = ref(emptySignals())
  const pendingList = ref([])
  const temperature = ref(null)
  const marketTemp = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({ page: 1, pageSize: 20, total: 0 })

  async function loadBonds(params = {}) {
    loading.value = true
    try {
      const data = await convertibleApi.list({ ...params, page: pagination.value.page, pageSize: pagination.value.pageSize })
      bondList.value = data.items || []
      pagination.value.total = data.total || 0
    } finally {
      loading.value = false
    }
  }

  function applySignals(rawSignals, pending) {
    const normalized = emptySignals()
    const fields = ['placement', 'double_low', 'force_redeem', 'discount', 'down_revised']
    fields.forEach(field => {
      if (rawSignals && Array.isArray(rawSignals[field])) {
        normalized[field] = sortByBest(rawSignals[field].map(normalizeBondItem), field)
      }
    })
    if (!normalized.placement || normalized.placement.length === 0) {
      normalized.placement = (rawSignals?.double_low || []).slice(0, 10).map(normalizeBondItem)
    }
    signals.value = normalized
    pendingList.value = (pending || []).map(normalizePendingItem).filter(Boolean)
  }

  function applyMarketTemp(rawSignals, overview) {
    const norm = signals.value
    const counts = {
      count: norm.double_low.length + norm.force_redeem.length,
      priceMedian: '--',
      premiumMedian: '--',
      doubleLowMedian: '--',
      marketStatus: '--',
      placementCount: pendingList.value.length,
      doubleLowCount: norm.double_low.length,
      forceRedeemCount: norm.force_redeem.length,
      discountCount: norm.discount.length,
      downRevisedCount: norm.down_revised.length
    }
    if (overview && overview.convertible_bond) {
      const cb = overview.convertible_bond
      counts.count = cb.count ?? counts.count
      counts.priceMedian = cb.price_median ?? '--'
      counts.premiumMedian = cb.premium_median !== undefined ? cb.premium_median : '--'
      counts.doubleLowMedian = cb.double_low_median ?? '--'
      counts.marketStatus = cb.market_status ?? '--'
    }
    marketTemp.value = counts
  }

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      // 各接口独立请求，互不影响；任一失败也能加载其他数据
      let rawSignals = null
      let pending = null
      let overview = null
      try { rawSignals = await convertibleApi.signals() } catch (e) { console.error('加载信号失败:', e) }
      try { pending = await convertibleApi.pending() } catch (e) { console.error('加载配售数据失败:', e) }
      try { overview = await marketApi.overview() } catch (e) { console.error('加载市场概览失败:', e) }

      applySignals(rawSignals, pending)
      applyMarketTemp(rawSignals, overview)

      // 若 overview 未返回温度，再单独请求温度接口兜底
      if (!overview?.convertible_bond) {
        try {
          const temp = await convertibleApi.temperature()
          if (temp && marketTemp.value) {
            marketTemp.value.count = temp.count ?? marketTemp.value.count
            marketTemp.value.priceMedian = temp.price_median ?? marketTemp.value.priceMedian
            marketTemp.value.premiumMedian = temp.premium_median !== undefined ? temp.premium_median : marketTemp.value.premiumMedian
            marketTemp.value.doubleLowMedian = temp.double_low_median ?? marketTemp.value.doubleLowMedian
            marketTemp.value.marketStatus = temp.market_status ?? marketTemp.value.marketStatus
          }
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      error.value = err?.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadSignals() {
    const data = await convertibleApi.signals()
    applySignals(data, [])
  }

  async function loadTemperature() {
    const data = await convertibleApi.temperature()
    temperature.value = data
  }

  function refreshFavorites() {
    const userStore = useUserStore()
    const favSet = new Set(userStore.favorites.filter(f => f.type === 'convertible').map(f => f.code))
    const mark = list => list.map(item => ({ ...item, isFavorite: favSet.has(item.bondCode) }))
    const next = {
      placement: signals.value.placement,
      double_low: mark(signals.value.double_low),
      force_redeem: mark(signals.value.force_redeem),
      discount: mark(signals.value.discount),
      down_revised: mark(signals.value.down_revised)
    }
    signals.value = next
  }

  return {
    bondList, signals, pendingList, temperature, marketTemp, loading, error, pagination,
    loadBonds, loadAll, loadSignals, loadTemperature, refreshFavorites
  }
})
