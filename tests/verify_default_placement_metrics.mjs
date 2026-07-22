import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'

const pendingCandidates = [
  {
    stock_name: 'MetricAlpha',
    stock_code: '600001',
    bond_name: 'Alpha Bond',
    bond_code: '110001',
    status: '同意注册',
    progress: '同意注册',
    issue_size: 1,
    tradable_amount: 0.1,
    stock_price: 10,
    shares_for_10_lots: 1000,
    per_share_allocation: 1,
    expected_profit: 999,
    safety_pad: 88,
    strategy_score: 1,
    strategy_rating: 'recommend'
  },
  {
    stock_name: 'MetricBeta',
    stock_code: '600002',
    bond_name: 'Beta Bond',
    bond_code: '110002',
    status: '同意注册',
    progress: '同意注册',
    issue_size: 0.5,
    tradable_amount: 0,
    stock_price: 10,
    shares_for_10_lots: 100,
    per_share_allocation: 10,
    expected_profit: 888,
    safety_pad: 77,
    strategy_score: 2,
    strategy_rating: 'caution'
  },
  {
    stock_name: 'MetricNoCost',
    stock_code: '600003',
    bond_name: 'No Cost Bond',
    bond_code: '110003',
    status: '同意注册',
    progress: '同意注册',
    issue_size: 1,
    tradable_amount: 0.1,
    stock_price: 0,
    shares_for_10_lots: 100,
    per_share_allocation: 1,
    expected_profit: 0,
    safety_pad: 0,
    strategy_score: 0,
    strategy_rating: 'caution'
  }
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const browserErrors = []
let pendingRequestCount = 0
page.on('pageerror', (error) => browserErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})

await page.route('**/api/v1/**', async (route) => {
  const { pathname } = new URL(route.request().url())
  let data = {}

  if (pathname.endsWith('/convertible/pending')) {
    pendingRequestCount += 1
    data = pendingCandidates
  }
  if (pathname.endsWith('/convertible/signals')) {
    data = { double_low: [], force_redeem: [], discount: [], down_revised: [] }
  }
  if (pathname.endsWith('/convertible/list')) data = { items: [], total: 0 }
  if (pathname.endsWith('/convertible/temperature')) data = {}
  if (pathname.endsWith('/market/overview')) data = { convertible_bond: {} }

  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, meta: {} })
  })
})

try {
  await page.goto(`${webUrl}/convertible`, { waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()

  const rows = page.locator('.desktop-table .el-table__row')
  assert.equal(await rows.count(), 3, 'fixed candidates should all render')

  const rowTexts = await rows.allTextContents()
  assert.match(rowTexts[0], /MetricBeta/, 'higher derived score should rank first')
  assert.match(rowTexts[1], /MetricAlpha/, 'second derived score should rank next')
  assert.match(rowTexts[2], /MetricNoCost/, 'missing-cost candidate should remain visible')

  const placementMetrics = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    const store = useConvertibleStore()
    return store.pendingList.map((item) => ({
      stockName: item.stockName,
      expectedProfit: item._expectedProfitRaw,
      safetyPad: item._safetyPadRaw,
      strategyScore: item.strategyScore,
      strategyRating: item.strategyRating,
      apiExpectedProfit: item._apiExpectedProfitRaw,
      apiSafetyPad: item._apiSafetyPadRaw,
      apiStrategyScore: item._apiStrategyScoreRaw
    }))
  })
  const alphaMetrics = placementMetrics.find((item) => item.stockName === 'MetricAlpha')
  const noCostMetrics = placementMetrics.find((item) => item.stockName === 'MetricNoCost')

  assert.deepEqual(alphaMetrics, {
    stockName: 'MetricAlpha',
    expectedProfit: 300,
    safetyPad: 3,
    strategyScore: 72,
    strategyRating: '可关注',
    apiExpectedProfit: 999,
    apiSafetyPad: 88,
    apiStrategyScore: 1
  })
  assert.deepEqual(noCostMetrics, {
    stockName: 'MetricNoCost',
    expectedProfit: 300,
    safetyPad: null,
    strategyScore: 63,
    strategyRating: '可关注',
    apiExpectedProfit: 0,
    apiSafetyPad: 0,
    apiStrategyScore: 0
  })

  const alphaRow = rows.filter({ hasText: 'MetricAlpha' })
  assert.match(await alphaRow.innerText(), /3\.00%/, '30% assumption should yield a 3% safety pad')
  assert.match(await alphaRow.innerText(), /可关注/, 'derived score should override the API rating')

  const noCostRow = rows.filter({ hasText: 'MetricNoCost' })
  assert.match(await noCostRow.innerText(), /--/, 'missing cost should render safety pad as unavailable')
  assert.match(await noCostRow.innerText(), /可关注/, 'missing cost should not inherit the API rating')

  await alphaRow.locator('.hover-value').first().hover()
  const formulaText = await page.locator('.formula-popper').last().innerText()
  assert.match(
    formulaText.replace(/\s+/g, ' '),
    /1000 × 30% = 300元/,
    'formula should disclose the default expected profit'
  )

  const premiumOptions = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    return useConvertibleStore().placementPremiumRateOptions
  })
  assert.deepEqual(premiumOptions, [30, 40, 50, 60, 70, 80, 90, 100], 'only approved premium options should be exposed')

  const requestsBeforeChange = pendingRequestCount
  await alphaRow.locator('td').first().click()
  await page.locator('.pending-dialog').waitFor()
  const adjustedMetrics = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    const store = useConvertibleStore()
    const changed = store.setPlacementPremiumRate(100)
    const alpha = store.pendingList.find((item) => item.stockName === 'MetricAlpha')
    return {
      changed,
      premiumRate: store.placementPremiumRate,
      expectedProfit: alpha._expectedProfitRaw,
      safetyPad: alpha._safetyPadRaw,
      strategyScore: alpha.strategyScore,
      strategyRating: alpha.strategyRating,
      saved: localStorage.getItem('convertiblePlacementPremiumRate')
    }
  })
  assert.deepEqual(adjustedMetrics, {
    changed: true,
    premiumRate: 100,
    expectedProfit: 1000,
    safetyPad: 10,
    strategyScore: 93,
    strategyRating: '推荐',
    saved: '100'
  }, '100% should synchronously recalculate and persist placement metrics')
  assert.equal(pendingRequestCount, requestsBeforeChange, 'changing the local assumption must not refetch placement data')

  await page.waitForFunction(() => document.querySelector('.pending-dialog')?.textContent?.includes('1000元'))
  const detailText = await page.locator('.pending-dialog').innerText()
  assert.match(detailText, /按 100% 假设/, 'open placement detail should disclose the active assumption')
  assert.match(detailText, /10\.00%/, 'open placement detail should refresh its safety pad')
  assert.match(detailText, /93\/100/, 'open placement detail should refresh its derived score')
  assert.match(detailText, /推荐/, 'open placement detail should refresh its derived rating')

  await page.keyboard.press('Escape')
  await page.locator('.pending-dialog').waitFor({ state: 'hidden' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-cards .mobile-card').first().waitFor()
  const mobileAlphaText = await page.locator('.mobile-cards .mobile-card').filter({ hasText: 'MetricAlpha' }).innerText()
  assert.match(mobileAlphaText, /安全垫（100%）10\.00%/, 'mobile card should disclose the same safety-pad assumption')
  assert.match(mobileAlphaText, /收益（100%）1000元/, 'mobile card should disclose the same expected profit')
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()
  const reloadedMetrics = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    const store = useConvertibleStore()
    return {
      premiumRate: store.placementPremiumRate,
      expectedProfit: store.pendingList.find((item) => item.stockName === 'MetricAlpha')._expectedProfitRaw
    }
  })
  assert.deepEqual(reloadedMetrics, { premiumRate: 100, expectedProfit: 1000 }, 'saved assumption should restore after refresh')

  const resetMetrics = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    const store = useConvertibleStore()
    store.resetPlacementPremiumRate()
    const alpha = store.pendingList.find((item) => item.stockName === 'MetricAlpha')
    return {
      premiumRate: store.placementPremiumRate,
      expectedProfit: alpha._expectedProfitRaw,
      saved: localStorage.getItem('convertiblePlacementPremiumRate')
    }
  })
  assert.deepEqual(resetMetrics, { premiumRate: 30, expectedProfit: 300, saved: '30' }, 'reset should restore and persist the default')

  await page.evaluate(() => localStorage.setItem('convertiblePlacementPremiumRate', '20'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()
  const invalidCacheMetrics = await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    const store = useConvertibleStore()
    return { premiumRate: store.placementPremiumRate, rejected: store.setPlacementPremiumRate(-10) }
  })
  assert.deepEqual(invalidCacheMetrics, { premiumRate: 30, rejected: false }, 'invalid persisted or updated values should never enter placement calculations')

  assert.deepEqual(browserErrors, [], 'placement rendering should not raise browser errors')
} finally {
  await browser.close()
}
