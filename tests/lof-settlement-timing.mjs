import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'

const verifiedSettlement = {
  subscription_confirmation: {
    status: 'verified',
    timing_text: 'T+1 个工作日',
    source: {
      title: '基金招募说明书',
      url: 'https://example.com/prospectus',
      effective_date: '2026-08-01',
      verified_at: '2026-08-05T09:30:00+08:00'
    }
  },
  redemption_payment: {
    status: 'verified',
    timing_text: 'T+2 个工作日',
    source: {
      title: '基金产品资料概要',
      url: 'https://example.com/fund-summary',
      effective_date: '2026-08-01',
      verified_at: '2026-08-04T09:30:00+08:00'
    }
  }
}

const staleSettlement = {
  ...verifiedSettlement,
  redemption_payment: {
    ...verifiedSettlement.redemption_payment,
    status: 'stale',
    timing_text: 'T+3 个工作日'
  }
}

const verifiedMinimumOrder = {
  subscription: {
    status: 'verified',
    display_text: '1000 元',
    source: verifiedSettlement.subscription_confirmation.source
  },
  redemption: {
    status: 'verified',
    display_text: '100 份',
    source: verifiedSettlement.redemption_payment.source
  }
}

const listItems = [
  {
    name: '时效核验 LOF',
    code: '501001',
    exchange: 'sh',
    price: 1.1,
    valuation: 1,
    premium: 10,
    change_pct: 1,
    amount: 1000,
    volume: 1000,
    limit_status: '不限',
    subscription_open: true,
    trade_path_verified: true,
    execution: {
      settlement_timing: verifiedSettlement,
      minimum_order: verifiedMinimumOrder
    }
  },
  {
    name: '陈旧时效 LOF',
    code: '501003',
    exchange: 'sh',
    price: 1.09,
    valuation: 1,
    premium: 9,
    change_pct: 1,
    amount: 950,
    volume: 950,
    limit_status: '不限',
    execution: { settlement_timing: staleSettlement }
  },
  {
    name: '旧接口 LOF',
    code: '501002',
    exchange: 'sz',
    price: 1.08,
    valuation: 1,
    premium: 8,
    change_pct: 1,
    amount: 900,
    volume: 900,
    limit_status: '不限'
  },
  {
    name: '无来源 LOF',
    code: '501005',
    exchange: 'sh',
    price: 1.06,
    valuation: 1,
    premium: 6,
    change_pct: 1,
    amount: 700,
    volume: 700,
    limit_status: '不限',
    execution: {
      settlement_timing: {
        subscription_confirmation: {
          status: 'verified',
          timing_text: 'T+1 个工作日'
        },
        redemption_payment: { status: 'verified', timing_text: 'T+2 个工作日' }
      }
    }
  }
]

const detail = {
  instrument: {
    name: '时效核验 LOF',
    code: '501001',
    exchange: 'sh',
    price: 1.1,
    valuation: 1,
    nav_date: '2026-08-05',
    quote_at: '2026-08-05T10:00:00+08:00'
  },
  strategy_status: 'observation',
  premium: {
    gross_pct: 10,
    net_assumption_pct: 9.8,
    cost_assumptions: { purchase_fee_pct: 0.15, sell_commission_pct: 0.05 },
    persistence: {
      consecutive_positive_sessions: 2,
      five_session: { available: false },
      twenty_session: { available: false }
    },
    observations: []
  },
  provenance: { history_sample_count: 0 },
  liquidity: {
    current_turnover: 100,
    current_volume: 100,
    five_session: { available: false },
    twenty_session: { available: false }
  },
  execution: {
    subscription_open: true,
    subscription_limit: '不限',
    custody_transfer: true,
    expected_sell_date: '2026-08-08',
    trade_path_verified: false,
    settlement_timing: staleSettlement,
    minimum_order: verifiedMinimumOrder
  },
  holdings: { available: false, reason: '暂无持仓披露' },
  volatility: {
    five_session: { available: false },
    twenty_session: { available: false }
  }
}

const partialDetail = {
  ...detail,
  instrument: { ...detail.instrument, name: '部分时效 LOF', code: '501004' },
  execution: {
    ...detail.execution,
    settlement_timing: {
      subscription_confirmation: verifiedSettlement.subscription_confirmation,
      redemption_payment: { status: 'unavailable', timing_text: 'T+9 个工作日' }
    }
  }
}

const legacyDetail = {
  ...detail,
  instrument: {
    ...detail.instrument,
    name: '旧接口 LOF',
    code: '501002',
    exchange: 'sz'
  },
  execution: { ...detail.execution, settlement_timing: undefined }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const browserErrors = []
page.on('pageerror', (error) => browserErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})

await page.route('**/api/v1/**', async (route) => {
  const { pathname } = new URL(route.request().url())
  let data = {}
  if (pathname.endsWith('/lof/list')) data = { items: listItems }
  if (pathname.endsWith('/lof/summary'))
    data = { count: 4, premium_avg: 8, top_premium: 10 }
  if (pathname.endsWith('/lof/501001/detail')) data = detail
  if (pathname.endsWith('/lof/501002/detail')) data = legacyDetail
  if (pathname.endsWith('/lof/501004/detail')) data = partialDetail

  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, meta: {} })
  })
})

try {
  await page.goto(`${webUrl}/lof`, { waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()

  const verifiedRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: '时效核验 LOF' })
  assert.match(
    await verifiedRow.innerText(),
    /申 T\+1 个工作日[\s\S]*赎 T\+2 个工作日/,
    'desktop list should show the service timings'
  )
  assert.match(
    await verifiedRow.innerText(),
    /申 1000 元[\s\S]*赎 100 份/,
    'desktop list should preserve the minimum amount and share units'
  )

  const legacyRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: '旧接口 LOF' })
  assert.match(
    await legacyRow.innerText(),
    /--/,
    'legacy list responses should explicitly show unavailable timings'
  )

  const staleRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: '陈旧时效 LOF' })
  assert.match(
    await staleRow.innerText(),
    /含陈旧时效/,
    'desktop list should label stale timings'
  )

  const missingEvidenceRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: '无来源 LOF' })
  assert.match(
    await missingEvidenceRow.innerText(),
    /--/,
    'verified status without evidence must degrade to unavailable'
  )

  await page.getByRole('button', { name: /套利机会/ }).click()
  const arbitrageRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: '时效核验 LOF' })
  await arbitrageRow.waitFor()
  assert.match(
    await arbitrageRow.innerText(),
    /申 T\+1 个工作日[\s\S]*赎 T\+2 个工作日/,
    'arbitrage table should show verified timings'
  )
  assert.equal(
    await page
      .locator('.desktop-table .el-table__row')
      .filter({ hasText: '无来源 LOF' })
      .count(),
    0,
    'missing evidence must exclude an item from executable arbitrage'
  )

  await page.getByRole('button', { name: /溢价Top10/ }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-cards .mobile-card').first().waitFor()
  const mobileText = await page
    .locator('.mobile-cards .mobile-card')
    .filter({ hasText: '时效核验 LOF' })
    .innerText()
  assert.match(
    mobileText,
    /申 T\+1 个工作日 \/ 赎 T\+2 个工作日[\s\S]*申 1000 元 \/ 赎 100 份/,
    'mobile cards should show the same service timings'
  )
  const mobileStaleText = await page
    .locator('.mobile-cards .mobile-card')
    .filter({ hasText: '陈旧时效 LOF' })
    .innerText()
  assert.match(
    mobileStaleText,
    /含陈旧时效/,
    'mobile cards should label stale timings'
  )

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${webUrl}/lof/501001`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '申购与交割' }).waitFor()

  const detailText = await page.locator('.evidence-list').innerText()
  assert.match(
    detailText,
    /申购确认时效[\s\S]*T\+1 个工作日/,
    'detail should show subscription confirmation timing'
  )
  assert.match(
    detailText,
    /赎回到账时效[\s\S]*T\+3 个工作日[\s\S]*陈旧/,
    'detail should keep and label stale redemption timing'
  )
  assert.match(
    detailText,
    /生效日期 2026-08-01/,
    'detail should disclose the source effective date'
  )
  assert.match(
    detailText,
    /核验时间 2026-08-05/,
    'detail should disclose verification time'
  )
  assert.match(
    detailText,
    /最低申购[\s\S]*1000 元[\s\S]*最低赎回[\s\S]*100 份/,
    'detail should preserve the minimum amount and share units'
  )
  assert.doesNotMatch(
    detailText,
    /当天可赎|T\+1可赎/,
    'detail must not infer an exchange redemption rule'
  )

  const source = page
    .locator('dd.timing-evidence')
    .filter({ hasText: 'T+1 个工作日' })
    .getByRole('link', { name: '基金招募说明书' })
  assert.equal(
    await source.getAttribute('href'),
    'https://example.com/prospectus',
    'detail should link to evidence'
  )
  assert.equal(
    await source.getAttribute('target'),
    '_blank',
    'evidence links should not navigate away from the detail view'
  )

  await page.goto(`${webUrl}/lof/501004`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '申购与交割' }).waitFor()
  const partialDetailText = await page.locator('.evidence-list').innerText()
  assert.match(
    partialDetailText,
    /申购确认时效[\s\S]*T\+1 个工作日/,
    'partial detail should retain its verified side'
  )
  assert.match(
    partialDetailText,
    /赎回到账时效[\s\S]*--/,
    'unavailable timing text should not be displayed'
  )
  assert.match(
    await page.locator('.status-line').innerText(),
    /执行路径证据未完整核验/,
    'partial detail must not claim a verified execution path'
  )

  await page.goto(`${webUrl}/lof/501002`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '申购与交割' }).waitFor()
  const legacyDetailText = await page.locator('.evidence-list').innerText()
  assert.match(
    legacyDetailText,
    /申购确认时效[\s\S]*--/,
    'legacy detail should show unavailable subscription timing'
  )
  assert.match(
    legacyDetailText,
    /赎回到账时效[\s\S]*--/,
    'legacy detail should show unavailable redemption timing'
  )
  assert.doesNotMatch(
    legacyDetailText,
    /当天可赎|T\+1可赎/,
    'legacy detail must not restore exchange-derived timing'
  )

  assert.deepEqual(
    browserErrors,
    [],
    'settlement timing rendering should not cause browser errors'
  )
} finally {
  await browser.close()
}
