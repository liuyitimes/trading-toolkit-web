function detectExchange(stockCode = '', bondCode = '') {
  if (
    stockCode.startsWith('6') ||
    stockCode.startsWith('5') ||
    stockCode.startsWith('9') ||
    bondCode.startsWith('11') ||
    bondCode.startsWith('13') ||
    bondCode.startsWith('5')
  )
    return '沪'
  if (
    stockCode.startsWith('0') ||
    stockCode.startsWith('1') ||
    stockCode.startsWith('2') ||
    stockCode.startsWith('3') ||
    bondCode.startsWith('12') ||
    bondCode.startsWith('16')
  )
    return '深'
  if (
    stockCode.startsWith('4') ||
    stockCode.startsWith('8') ||
    bondCode.startsWith('8')
  )
    return '京'
  return ''
}

function formatPercent(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? (value >= 0 ? '+' : '') + value.toFixed(2) + '%'
    : '--'
}

function formatPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value.toFixed(2)
    : '--'
}

export function normalizeNewListedItem(item) {
  if (!item || typeof item !== 'object') return null
  const bondCode = item.bond_code || ''
  const stockCode = String(item.stock_code || '')
  const exchange = item.exchange || detectExchange(stockCode, bondCode)
  const latestClose =
    typeof item.latest_close === 'number' ? item.latest_close : null
  const price = typeof item.price === 'number' ? item.price : latestClose
  const gainSinceListing =
    typeof item.gain_since_listing === 'number' ? item.gain_since_listing : null
  const monthGain = typeof item.month_gain === 'number' ? item.month_gain : null
  const threeDayGain =
    typeof item.three_day_gain === 'number' ? item.three_day_gain : null
  const changePct = typeof item.change_pct === 'number' ? item.change_pct : null

  return {
    bondCode,
    bondName: item.bond_name || '--',
    stockCode,
    stockName: item.stock_name || '--',
    exchange,
    listDate: item.list_date || '--',
    latestPrice: formatPrice(price),
    latestClose: formatPrice(latestClose),
    latestTradeDate: item.latest_trade_date || '--',
    listingClose: formatPrice(item.listing_close),
    monthBaseClose: formatPrice(item.month_base_close),
    threeDayPrice: formatPrice(item.three_day_price),
    threeDayPriceDate: item.three_day_price_date || '--',
    threeDayStage: item.three_day_stage || 0,
    gainSinceListing: formatPercent(gainSinceListing),
    _gainSinceListingRaw: gainSinceListing,
    monthGain: formatPercent(monthGain),
    _monthGainRaw: monthGain,
    threeDayGain: formatPercent(threeDayGain),
    _threeDayGainRaw: threeDayGain,
    changePct: formatPercent(changePct),
    _changePctRaw: changePct,
    premiumRate: formatPercent(item.premium_rate),
    _premiumRateRaw:
      typeof item.premium_rate === 'number' ? item.premium_rate : null,
    isFavorite: false
  }
}
