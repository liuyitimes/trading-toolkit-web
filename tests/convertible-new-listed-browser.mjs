import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'

const newListedData = [
  {
    bond_code: '113708',
    bond_name: 'N曙26转',
    stock_code: '603019',
    stock_name: '中科曙光',
    exchange: 'sh',
    list_date: '2026-08-06',
    price: 146.72,
    latest_close: 146.72,
    latest_trade_date: '2026-08-06',
    listing_close: 146.72,
    gain_since_listing: 0,
    change_pct: 46.72,
    premium_rate: 81.97,
    issue_size: 80,
    turnover_rate: 24.64
  }
]

const detailData = {
  bond_code: '113708',
  bond_name: 'N曙26转',
  stock_code: '603019',
  stock_name: '中科曙光',
  exchange: 'sh',
  price: 146.72,
  change_pct: 46.72,
  conversion_value: 80.63,
  premium_rate: 81.97,
  double_low: 228.7,
  rating: 'AAA',
  stock_price: 87.8,
  conversion_price: 108.89,
  force_trigger_price: 141.56,
  revise_trigger_price: 92.56,
  remaining_size: 80,
  volume: 1971211,
  amount: 2884211637,
  pure_bond_value: 94.75,
  ytm: -5.03,
  maturity_date: '2032-07-15'
}

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    let data = {}
    if (pathname.endsWith('/convertible/new-listed')) {
      data = newListedData
    } else if (pathname.includes('/convertible/detail/')) {
      data = detailData
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: {} })
    })
  })

  await page.goto(`${webUrl}/convertible`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '今年新债' }).click()

  const tableHeader = await page.locator('table').first().innerText()
  assert.match(tableHeader, /剩余规模/, '新债表格应展示剩余规模列')
  assert.match(tableHeader, /换手率/, '新债表格应展示换手率列')
  assert.doesNotMatch(tableHeader, /本月/, '不应再展示本月列')
  assert.doesNotMatch(tableHeader, /前三日/, '不应再展示前三日列')

  const firstRow = page.locator('tbody tr').first()
  const rowText = await firstRow.innerText()
  assert.match(rowText, /80\.00亿/, '剩余规模应显示发行规模（亿元）')
  assert.match(rowText, /\+24\.64%/, '换手率应显示东财换手率')
  assert.doesNotMatch(rowText, /第\d日/, '不应再展示第 N 日标签')

  await firstRow.click()
  await page.waitForURL(/\/convertible\/113708/)
  await page.getByText('N曙26转').first().waitFor()
  assert.match(
    await page.locator('.page-container').innerText(),
    /转股价值/,
    '详情页应渲染实际内容而非空白'
  )
  await page.close()

  const missingPage = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  })
  await missingPage.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const data = pathname.includes('/convertible/detail/') ? {} : {}
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: {} })
    })
  })
  await missingPage.goto(`${webUrl}/convertible/999999`, {
    waitUntil: 'networkidle'
  })
  await missingPage.getByRole('button', { name: '重试' }).waitFor()
  await missingPage.close()

  console.log('convertible new listed browser verification passed')
} finally {
  await browser.close()
}
