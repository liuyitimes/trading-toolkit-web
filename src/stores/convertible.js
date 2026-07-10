import { defineStore } from 'pinia'
import { ref } from 'vue'
import { convertibleApi } from '@/api/convertible'
import { marketApi } from '@/api/market'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

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

// progress_full 中的阶段名 → ALL_STAGES 名称映射
const STAGE_NAME_ALIASES = {
  '董事会预案': '董事会预案',
  '股东大会通过': '股东大会批准',
  '股东大会批准': '股东大会批准',
  '交易所受理': '交易所受理',
  '上市委通过': '上市委通过',
  '同意注册': '同意注册',
}

// 额外日期模式（非阶段，但需从 progress_full 中解析）
const EXTRA_DATE_PATTERNS = ['股权登记日', '股权登记', '登记日']

function parseProgressDates(progressFull) {
  const map = {}
  if (!progressFull) return map
  // 去除 HTML 标签，兼容富文本格式
  const text = String(progressFull).replace(/<[^>]*>/g, ' ')
  const lines = text.split(/[\n,;]/)
  for (const line of lines) {
    // 兼容 YYYY-MM-DD 和 YYYY/MM/DD 两种日期格式
    const m = line.trim().match(/(\d{4}[-/]\d{2}[-/]\d{2})\s*(.*)/)
    if (!m) continue
    const date = m[1].replace(/\//g, '-')
    const stageText = m[2].trim()
    // 匹配标准阶段
    let matched = false
    for (const [alias, canonical] of Object.entries(STAGE_NAME_ALIASES)) {
      if (stageText.includes(alias)) {
        map[canonical] = date
        matched = true
        break
      }
    }
    // 匹配额外日期模式（股权登记日等）
    if (!matched) {
      for (const pattern of EXTRA_DATE_PATTERNS) {
        if (stageText.includes(pattern)) {
          map['股权登记日'] = date
          break
        }
      }
    }
  }
  return map
}

function stripHtml(text) {
  if (!text) return text
  return text.replace(/<[^>]*>/g, ' ')
}

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
  let forceTriggerPrice = conversionPriceNum > 0 ? conversionPriceNum * 1.3 : 0
  if (conversionPriceNum > 0 && stockPriceNum > 0) {
    const gap = (stockPriceNum - forceTriggerPrice) / forceTriggerPrice * 100
    _forcePriceGap = gap
    forceRedemptionGap = (gap > 0 ? '+' : '') + gap.toFixed(1) + '%'
    forceRedemptionClass = gap >= 0 ? 'warning' : ''
  }

  let downReviseGap = '--'
  let downReviseClass = ''
  let _revisePriceGap = 9999
  let reviseTriggerPrice = conversionPriceNum > 0 ? conversionPriceNum * 0.85 : 0
  if (conversionPriceNum > 0 && stockPriceNum > 0) {
    const gap = (stockPriceNum - reviseTriggerPrice) / reviseTriggerPrice * 100
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

  const volumeNum = typeof item.volume === 'number' ? item.volume : 0
  const amountNum = typeof item.amount === 'number' ? item.amount : 0
  const remainingSizeNum = typeof item.remaining_size === 'number' ? item.remaining_size : 0

  let volumeText = '--'
  if (volumeNum > 0) {
    if (volumeNum >= 10000) volumeText = (volumeNum / 10000).toFixed(2) + '万手'
    else volumeText = volumeNum.toFixed(0) + '手'
  }

  let amountText = '--'
  if (amountNum > 0) {
    if (amountNum >= 100000000) amountText = (amountNum / 100000000).toFixed(2) + '亿'
    else if (amountNum >= 10000) amountText = (amountNum / 10000).toFixed(2) + '万'
    else amountText = amountNum.toFixed(0)
  }

  const remainingSizeText = remainingSizeNum > 0 ? remainingSizeNum.toFixed(2) + '亿' : '--'

  const perShareValue = item.per_share_allocation || 0
  let cashRatio = 0
  if (perShareValue > 0 && stockPriceNum > 0) {
    cashRatio = Math.round(perShareValue / stockPriceNum * 10000) / 100
  }

  return {
    bondName: item.bond_name || '--',
    bondCode,
    stockName: item.stock_name || '--',
    stockCode,
    exchange,
    price: priceNum ? priceNum.toFixed(2) : '--',
    _priceRaw: priceNum,
    priceNum,
    conversionValue: conversionValueNum ? conversionValueNum.toFixed(2) : '--',
    _conversionValueRaw: conversionValueNum,
    conversionValueNum,
    premium: item.premium_rate != null ? premiumRateNum.toFixed(2) + '%' : '--',
    premiumClass: premiumRateNum < 0 ? 'negative' : premiumRateNum > 30 ? 'high' : '',
    premiumNum: premiumRateNum,
    doubleLow: doubleLowNum > 0 ? doubleLowNum.toFixed(1) : '--',
    _doubleLowRaw: doubleLowNum,
    doubleLowNum,
    conversionPrice: conversionPriceNum ? conversionPriceNum.toFixed(2) : '--',
    _conversionPriceRaw: conversionPriceNum,
    conversionPriceNum,
    stockPrice: stockPriceNum ? stockPriceNum.toFixed(2) : '--',
    _stockPriceRaw: stockPriceNum,
    stockPriceNum,
    pureBondValue: pureBondValueNum ? pureBondValueNum.toFixed(2) : '--',
    _pureBondValueRaw: pureBondValueNum,
    ytm: ytmNum !== null ? (ytmNum > 0 ? '+' : '') + ytmNum.toFixed(2) + '%' : '--',
    _ytmRaw: ytmNum,
    rating,
    forceRedemptionGap,
    forceRedemptionClass,
    _forcePriceGap,
    forceTriggerPrice: forceTriggerPrice > 0 ? forceTriggerPrice.toFixed(2) : '--',
    downReviseGap,
    downReviseClass,
    _revisePriceGap,
    reviseTriggerPrice: reviseTriggerPrice > 0 ? reviseTriggerPrice.toFixed(2) : '--',
    discountSpace,
    discountClass,
    hundredRight: hundredRightValue != null ? hundredRightValue.toFixed(2) : '--',
    _hundredRightRaw: hundredRightValue,
    lotStock: lotStockCount != null ? lotStockCount + '股' : '--',
    safetyPad: safetyPadValue != null ? safetyPadValue.toFixed(1) + '%' : '--',
    _safetyPadRaw: safetyPadValue,
    volume: volumeText,
    _volumeRaw: volumeNum,
    amount: amountText,
    _amountRaw: amountNum,
    remainingSize: remainingSizeText,
    _remainingSizeRaw: remainingSizeNum,
    maturityDate: item.maturity_date || '--',
    cashRatio: cashRatio > 0 ? cashRatio.toFixed(2) + '元' : '--',
    _cashRatioRaw: cashRatio,
    perShare: perShareValue > 0 ? perShareValue.toFixed(4) + '元' : '--',
    _perShareRaw: perShareValue,
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
  const progress = stripHtml(item.progress) || status
  const issueSize = item.issue_size || 0
  const rating = item.rating || ''
  const shareholderRatio = item.shareholder_ratio || 0
  const stockPrice = item.stock_price || 0
  const stockChange = item.stock_change || 0
  const conversionPrice = item.conversion_price || 0
  const pb = item.pb || 0
  const rawPerShare = item.per_share_allocation || 0
  const sharesFor10 = item.shares_for_10_lots || 0
  // 每股配售：后端 ration 为 0 时，用 apply10 反推（1000元 / 配10张股数）
  const perShare = rawPerShare > 0 ? rawPerShare : (sharesFor10 > 0 ? 1000 / sharesFor10 : 0)
  // 股权登记日：优先后端字段，兜底从 progress_full 解析或备选字段名
  const _stageDateMap = parseProgressDates(item.progress_full || '')
  const regDate = item.registration_date || item.reg_date || _stageDateMap['股权登记日'] || ''
  const onlineIssueSize = item.online_issue_size || 0
  const winRate = item.win_rate || 0

  // 百元含权：优先用每股配售/正股价自算，无数据时兜底 stock_cash_ratio
  const cashRatio = perShare > 0 && stockPrice > 0
    ? Math.round(perShare / stockPrice * 10000) / 100
    : (item.stock_cash_ratio || 0)

  const riskLevel = item.risk_level || 'mid'
  const recordPrice = item.record_price || 0
  const ma20Price = item.ma20_price || 0

  // 获配每手（10张债券）所需股数（理论值，不取整）
  // 1手债券=10张，配10张需股数即为获配每手理论股数
  const _sharesPerLotRaw = sharesFor10;

  // A股最小交易单位：1手 = 100股，向上取整到100的整数倍
  const _actualSharesFor1Lot = _sharesPerLotRaw > 0 ? Math.ceil(_sharesPerLotRaw / 100) * 100 : 0;

  // 获配每手所需成本（按实际需购买的整数手股数计算）
  const _costPerLotRaw = _actualSharesFor1Lot * stockPrice;

  // 安全垫（用实际股数计算，贴近真实成交成本）
  const _safetyPadValue = item.safety_pad > 0
    ? item.safety_pad
    : computeSafetyPad(perShare, stockPrice, _actualSharesFor1Lot, 0.2).value
  const expectedProfit = item.expected_profit > 0
    ? item.expected_profit
    : computeSafetyPad(perShare, stockPrice, _actualSharesFor1Lot, 0.2).profit

  // 正股趋势（相对20日均价偏离）
  const stockTrend = ma20Price > 0 ? Math.round((stockPrice - ma20Price) / ma20Price * 10000) / 100 : 0

  const exchange = detectExchange(stockCode, bondCode)

  // 登记日徽标：仅在申购日未过期时显示
  const today = new Date().toISOString().slice(0, 10)
  const applyDate = item.apply_date || ''
  let regBadge = ''
  let regBadgeClass = ''
  if (regDate && (!applyDate || applyDate >= today)) {
    if (regDate === today) { regBadge = '今日登记'; regBadgeClass = 'hot' }
    else if (regDate > today) {
      const diff = Math.ceil((new Date(regDate) - new Date()) / 86400000)
      if (diff === 1) { regBadge = '明日登记'; regBadgeClass = 'warm' }
      else if (diff <= 3) { regBadge = diff + '天后登记'; regBadgeClass = 'warm' }
    }
  }

  // 一手党标记（沪市+配10张市值<10000元）
  const oneHandParty = exchange === '沪' && sharesFor10 > 0 && stockPrice > 0 && (sharesFor10 * stockPrice) < 10000
  const _costFor10LotsRaw = _costPerLotRaw

  // 沪市一手党：理论最低50%（精确算法四舍五入），实操建议60%以提高成功率
  // 向上取整到100股整数倍（A股最小交易单位）
  const _oneHandMinShares = exchange === '沪' && sharesFor10 > 0 ? Math.ceil(sharesFor10 * 0.6 / 100) * 100 : 0

  const riskLabel = riskLevel === 'high' ? '高风险' : riskLevel === 'low' ? '低风险' : '中风险'

  // 综合排序分（直接使用后端 strategy_score，0-100）
  const _compositeRankRaw = item.strategy_score ?? 0

  // 首日可交易量 & 策略评级（后端新增字段）
  const tradableAmount = item.tradable_amount != null ? item.tradable_amount.toFixed(2) + '亿' : '--'
  const _tradableAmountRaw = item.tradable_amount ?? 0
  const strategyScore = item.strategy_score ?? 0
  const strategyRating = item.strategy_rating === 'recommend' ? '推荐'
    : item.strategy_rating === 'watch' ? '可关注' : '谨慎'
  const strategyRatingClass = item.strategy_rating || 'caution'

  // 发行时间轴 — 复用已解析的 stageDateMap，补充申购/上市日期
  const stageDateMap = _stageDateMap
  if (item.apply_date) stageDateMap['申购中'] = item.apply_date
  if (item.list_date) stageDateMap['待上市'] = item.list_date

  let currentStageIndex = 0
  if (status && status !== '--') {
    const idx = ALL_STAGES.indexOf(status)
    if (idx >= 0) currentStageIndex = idx
  }
  const stageList = ALL_STAGES.map((name, i) => ({
    name,
    date: stageDateMap[name] || '',
    status: i < currentStageIndex ? 'done' : i === currentStageIndex ? 'current' : 'pending'
  }))

  const { sectorTag, isHotSector } = detectSector(stockName)

  return {
    stockName, stockCode, exchange,
    stockPrice: stockPrice ? stockPrice.toFixed(2) : '--',
    _stockPriceRaw: stockPrice,
    stockChange: stockChange != null ? (stockChange >= 0 ? '+' : '') + stockChange.toFixed(2) + '%' : '--',
    stockChangeUp: stockChange >= 0,
    _stockChangeRaw: stockChange,
    bondName: bondName || '--',
    bondCode: bondCode || '--',
    progress, _status: status,
    issueSize: issueSize ? issueSize.toFixed(2) + '亿' : '--',
    _issueSizeRaw: issueSize,
    rating: rating || '--',
    shareholderRatio: shareholderRatio != null ? shareholderRatio.toFixed(1) + '%' : '--',
    _shareholderRatioRaw: shareholderRatio,
    conversionPrice: conversionPrice ? conversionPrice.toFixed(2) : '--',
    pb: pb ? pb.toFixed(2) : '--',
    cashRatio: cashRatio != null ? cashRatio.toFixed(2) + '元' : '--',
    _cashRatioRaw: cashRatio,
    perShare: perShare ? perShare.toFixed(4) + '元' : '--',
    _perShareRaw: perShare,
    sharesFor10: sharesFor10 ? sharesFor10 + '股' : '--',
    _sharesFor10Raw: sharesFor10,
    costFor10Lots: _costFor10LotsRaw > 0 ? Math.round(_costFor10LotsRaw) + '元' : '--',
    _costFor10LotsRaw,
    costPerLot: _costPerLotRaw > 0 ? Math.round(_costPerLotRaw) + '元' : '-',
    _costPerLotRaw,
    actualSharesFor1Lot: _actualSharesFor1Lot > 0 ? _actualSharesFor1Lot + '股（' + (_actualSharesFor1Lot / 100) + '手）' : '-',
    _actualSharesFor1Lot,
    sharesPerLotRaw: _sharesPerLotRaw > 0 ? _sharesPerLotRaw.toFixed(1) + '股' : '-',
    _sharesPerLotRaw,
    _oneHandMinShares,
    oneHandMinCost: _oneHandMinShares > 0 ? Math.round(_oneHandMinShares * stockPrice) + '元' : '',
    _oneHandMinCostRaw: _oneHandMinShares > 0 ? Math.round(_oneHandMinShares * stockPrice) : 0,
    regDate: regDate || '--',
    regBadge, regBadgeClass,
    onlineIssueSize: onlineIssueSize ? onlineIssueSize.toFixed(2) + '亿' : '--',
    winRate: winRate != null ? (winRate * 100).toFixed(3) + '%' : '--',
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
    tradableAmount,
    _tradableAmountRaw,
    strategyScore,
    strategyRating,
    strategyRatingClass,
    _compositeRankRaw,
    progressClass: progress.includes('申购') || progress.includes('上市') ? 'hot' : 'warm',
    _applyDate: item.apply_date || '',
    _listDate: item.list_date || '',
    stageDot: status === '申购中' || status === '待上市' ? 'dot-final'
      : status === '同意注册' || status === '上市委通过' ? 'dot-mid'
        : status === '交易所受理' ? 'dot-early' : 'dot-first',
    detail: {
      stockName, stockCode,
      bondName: bondName || '暂无', bondCode: bondCode || '暂无',
      progress, status,
      regDate: regDate || '暂无',
      regDateRaw: regDate,
      applyDate: item.apply_date || '',
      listDate: item.list_date || '',
      progressDt: item.progress_dt || '',
      issueSize: issueSize ? issueSize.toFixed(2) + '亿元' : '暂无',
      rating: rating || '暂无',
      shareholderRatio: shareholderRatio != null ? shareholderRatio.toFixed(1) + '%' : '暂无',
      conversionPrice: conversionPrice ? conversionPrice.toFixed(2) + '元' : '暂无',
      stockPrice: stockPrice ? stockPrice.toFixed(2) + '元' : '暂无',
      stockChange: stockChange != null ? (stockChange >= 0 ? '+' : '') + stockChange.toFixed(2) + '%' : '暂无',
      pb: pb ? pb.toFixed(2) : '暂无',
      cashRatio: cashRatio != null ? cashRatio.toFixed(2) + '元/百元' : '暂无',
      perShare: perShare ? perShare.toFixed(4) + '元' : '暂无',
      sharesFor10: sharesFor10 ? sharesFor10 + '股' : '暂无',
      onlineIssueSize: onlineIssueSize ? onlineIssueSize.toFixed(2) + '亿元' : '暂无',
      winRate: winRate != null ? (winRate * 100).toFixed(3) + '%' : '暂无',
      riskLevel, riskLabel, riskClass: riskLevel,
      safetyPad: _safetyPadValue > 0 ? _safetyPadValue.toFixed(2) + '%' : '暂无',
      _safetyPadRaw: _safetyPadValue,
      expectedProfit: expectedProfit > 0 ? Math.round(expectedProfit) + '元' : '暂无',
      _expectedProfitRaw: expectedProfit,
      stockTrend: stockTrend !== 0 ? (stockTrend >= 0 ? '+' : '') + stockTrend.toFixed(2) + '%' : '暂无',
      _stockTrendRaw: stockTrend,
      recordPrice: recordPrice ? recordPrice.toFixed(2) + '元' : '暂无',
      ma20Price: ma20Price ? ma20Price.toFixed(2) + '元' : '暂无',
      oneHandMinCost: _oneHandMinShares > 0 ? Math.round(_oneHandMinShares * stockPrice) + '元' : '暂无',
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
  const tier = 'beginner'
  const threshold = 10000
  const lastUpdated = ref(null)
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

  function applySignals(rawSignals, pending, bondListData = []) {
    const normalized = emptySignals()
    // 将完整转债列表构建为映射表，用于补充信号数据中缺失的字段
    const bondMap = new Map()
    for (const item of bondListData) {
      const code = item.bond_code || item.bondCode
      if (code) bondMap.set(code, item)
    }

    // 信号 Tab 仅处理已上市转债的 4 类信号；配售 Tab 使用独立的 pendingList
    const fields = ['double_low', 'force_redeem', 'discount', 'down_revised']
    fields.forEach(field => {
      if (rawSignals && Array.isArray(rawSignals[field])) {
        normalized[field] = sortByBest(rawSignals[field].map(signalItem => {
          const code = signalItem.bond_code || signalItem.bondCode
          const fullItem = bondMap.get(code)
          if (fullItem) {
            return normalizeBondItem({ ...signalItem, ...fullItem })
          }
          return normalizeBondItem(signalItem)
        }), field)
      }
    })
    signals.value = normalized

    const today = new Date().toISOString().slice(0, 10)
    pendingList.value = (pending || [])
      .map(normalizePendingItem)
      .filter(Boolean)
      .filter(item => isPendingPlacementVisible(item, today))
  }

  /**
   * 配售列表可见性过滤
   *
   * 语义：只保留"还能参与配售"的标的，即股权登记日尚未过期的标的。
   *   - regDate >= today → 还能登记 → 保留
   *   - regDate <  today → 登记窗口已关闭 → 过滤
   *   - regDate 缺失/为占位符 '--' → 当作"无登记日"，按当前数据放行
   *
   * 字符串日期 YYYY-MM-DD 字典序等价于日期序，可直接 < 比较
   */
  function isPendingPlacementVisible(item, today) {
    const regDate = item.regDate && item.regDate !== '--' ? item.regDate : ''
    if (regDate && regDate < today) return false
    return true
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
      let bondListData = null
      try { rawSignals = await convertibleApi.signals() } catch (e) { console.error('加载信号失败:', e) }
      try { pending = await convertibleApi.pending() } catch (e) { console.error('加载配售数据失败:', e) }
      try { overview = await marketApi.overview() } catch (e) { console.error('加载市场概览失败:', e) }
      try { bondListData = await convertibleApi.list({ page: 1, pageSize: 500 }) } catch (e) { console.error('加载转债列表失败:', e) }

      applySignals(rawSignals, pending, bondListData?.items || [])
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
      lastUpdated.value = new Date().toISOString()
      useAppStore().setLastUpdated()
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
    tier, threshold, lastUpdated,
    loadBonds, loadAll, loadSignals, loadTemperature, refreshFavorites
  }
})
