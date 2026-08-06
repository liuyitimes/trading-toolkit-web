import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'

const listData = {
  items: [
    {
      name: '完整连续',
      code: '501001',
      exchange: 'sh',
      price: 1.08,
      valuation: 1,
      premium: 8,
      change_pct: 1,
      amount: 1200,
      volume: 800,
      limit_status: '不限',
      premium_persistence: {
        consecutive_positive_sessions: 5,
        status: 'complete',
        as_of: '2026-08-06',
        history_started_on: null,
        reason: null
      }
    },
    {
      name: '历史不足',
      code: '501002',
      exchange: 'sh',
      price: 1.06,
      valuation: 1,
      premium: 6,
      change_pct: 1,
      amount: 1100,
      volume: 700,
      limit_status: '不限',
      premium_persistence: {
        consecutive_positive_sessions: 3,
        status: 'partial',
        as_of: '2026-08-06',
        history_started_on: '2026-01-05',
        reason: '历史覆盖不足：最早覆盖日为 2026-01-05'
      }
    },
    {
      name: '不可比',
      code: '501003',
      exchange: 'sh',
      price: 1.04,
      valuation: 1,
      premium: 4,
      change_pct: 1,
      amount: 1000,
      volume: 600,
      limit_status: '不限',
      premium_persistence: {
        consecutive_positive_sessions: null,
        status: 'unavailable',
        as_of: '2026-08-06',
        history_started_on: null,
        reason: '当前交易日 2026-08-06 无同日可比观测'
      }
    },
    {
      name: '真实零天',
      code: '501004',
      exchange: 'sh',
      price: 1.02,
      valuation: 1,
      premium: 2,
      change_pct: 1,
      amount: 900,
      volume: 500,
      limit_status: '不限',
      premium_persistence: {
        consecutive_positive_sessions: 0,
        status: 'complete',
        as_of: '2026-08-06',
        history_started_on: null,
        reason: null
      }
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
        ? {}
        : {}
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: {} })
    })
  })
  await page.goto(`${webUrl}/lof`, { waitUntil: 'networkidle' })
  await page.getByRole('table').first().waitFor()

  const consecutiveCell = async (name) =>
    page.locator('tbody tr', { hasText: name }).locator('td').nth(4).innerText()

  assert.match(await consecutiveCell('完整连续'), /5 天/)
  assert.match(await consecutiveCell('历史不足'), /至少 3 天/)
  assert.match(await consecutiveCell('真实零天'), /0 天/)
  assert.equal((await consecutiveCell('不可比')).trim(), '--')

  const partialRow = page.locator('tbody tr', { hasText: '历史不足' })
  await partialRow.locator('td').nth(4).hover()
  await page.getByText('历史覆盖不足', { exact: false }).waitFor()

  const unavailableRow = page.locator('tbody tr', { hasText: '不可比' })
  await unavailableRow.locator('td').nth(4).hover()
  await page.getByText('无同日可比观测', { exact: false }).waitFor()

  console.log('lof premium browser verification passed')
} finally {
  await browser.close()
}
