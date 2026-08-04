import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'
const persistence = (sessions, status, reason = null) => ({
  consecutive_positive_sessions: sessions,
  status,
  as_of: '2026-08-03',
  history_started_on: '2026-01-02',
  reason
})

const listData = {
  items: [
    {
      name: '完整零天 LOF',
      code: '501001',
      exchange: 'sh',
      price: 1,
      valuation: 1,
      premium: 8,
      change_pct: 1,
      amount: 1200,
      volume: 800,
      limit_status: '不限',
      premium_persistence: persistence(0, 'complete')
    },
    {
      name: '历史不足 LOF',
      code: '501002',
      exchange: 'sh',
      price: 1.1,
      valuation: 1,
      premium: 7,
      change_pct: 1,
      amount: 1200,
      volume: 800,
      limit_status: '不限',
      premium_persistence: persistence(
        3,
        'partial',
        '连续序列触及历史覆盖起点 2026-01-02，历史不足'
      )
    },
    {
      name: '不可用 LOF',
      code: '501003',
      exchange: 'sh',
      price: 1.1,
      valuation: 1,
      premium: 6,
      change_pct: 1,
      amount: 1200,
      volume: 800,
      limit_status: '不限',
      premium_persistence: persistence(
        null,
        'unavailable',
        '当前交易日缺少同日可比观测'
      )
    }
  ]
}

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const data = pathname.endsWith('/lof/list')
      ? listData
      : pathname.endsWith('/lof/summary')
        ? {
            daily_subscription: {
              status: 'unavailable',
              reason: '暂无经核验的日度数据'
            }
          }
        : {}
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: {} })
    })
  })
  await page.goto(`${webUrl}/lof`, { waitUntil: 'networkidle' })
  await page.locator('.desktop-table').waitFor()
  const tableText = await page.locator('.desktop-table').innerText()
  assert.match(tableText, /0天/)
  assert.match(tableText, /至少 3 天/)
  assert.match(tableText, /历史不足/)
  assert.match(tableText, /--/)

  await page
    .locator('.desktop-table tbody')
    .getByText('历史不足 LOF', { exact: true })
    .click()
  await page
    .getByText('连续序列触及历史覆盖起点 2026-01-02，历史不足')
    .waitFor()
} finally {
  await browser.close()
}
