import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'

const listData = {
  items: [
    {
      name: '科技创新 LOF',
      code: '501999',
      exchange: 'sh',
      price: 1.08,
      valuation: 1,
      premium: 8,
      change_pct: 1,
      amount: 1200,
      volume: 800,
      limit_status: '不限'
    }
  ]
}

async function openLofOverview(browser, summary) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const data = pathname.endsWith('/lof/list')
      ? listData
      : pathname.endsWith('/lof/summary')
        ? summary
        : {}
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: {} })
    })
  })
  await page.goto(`${webUrl}/lof`, { waitUntil: 'networkidle' })
  await page.locator('.market-overview').waitFor()
  return page
}

const browser = await chromium.launch({ headless: true })

try {
  const availablePage = await openLofOverview(browser, {
    hot_direction: {
      status: 'available',
      reason: null,
      name: '科技创新',
      method: '成交额加权正溢价',
      weighted_premium: 6.25,
      sample_count: 3,
      unclassified_count: 1,
      constituents: [
        {
          code: '501999',
          name: '科技创新 LOF',
          basis: '基金产品名称',
          premium: 8,
          turnover_yuan: 12000000
        },
        {
          code: '501998',
          name: '科技创新二号',
          basis: '基金产品名称',
          premium: 6,
          turnover_yuan: 8000000
        },
        {
          code: '501997',
          name: '科技创新三号',
          basis: '基金产品名称',
          premium: 5,
          turnover_yuan: 6000000
        }
      ],
      as_of: '2026-07-25',
      source: 'LOF 主题分类表（基金产品名称）',
      retrieved_at: '2026-07-25T15:30:00+08:00'
    },
    daily_subscription: {
      status: 'unavailable',
      reason: '暂无经核验的日度数据'
    }
  })
  const availableText = await availablePage
    .locator('.market-overview')
    .innerText()
  assert.match(
    availableText,
    /科技创新/,
    'overview should show the verified premium direction'
  )
  assert.match(
    availableText,
    /成交额加权正溢价 6\.25% · 3只/,
    'overview should disclose the direction method, weighted premium, and sample count'
  )
  assert.match(
    availableText,
    /数据日期 2026-07-25 · LOF 主题分类表（基金产品名称） · 获取 2026-07-25T15:30:00\+08:00 · 未分类1只/,
    'overview should disclose the direction provenance and unclassified coverage'
  )
  await availablePage.getByRole('button', { name: '查看构成' }).click()
  await assert.doesNotReject(
    availablePage.getByText('科技创新 LOF（501999）').waitFor(),
    'overview should expose the classified constituents for inspection'
  )
  await availablePage.close()

  const incompleteEvidencePage = await openLofOverview(browser, {
    hot_direction: {
      status: 'available',
      reason: null,
      name: '科技创新',
      method: '成交额加权正溢价',
      weighted_premium: 6.25,
      sample_count: 1,
      unclassified_count: 0,
      constituents: [],
      as_of: '2026-07-25',
      source: null,
      retrieved_at: '2026-07-25T15:30:00+08:00'
    },
    daily_subscription: {
      status: 'unavailable',
      reason: '暂无经核验的日度数据'
    }
  })
  const incompleteEvidenceText = await incompleteEvidencePage
    .locator('.market-overview')
    .innerText()
  assert.match(
    incompleteEvidenceText,
    /暂缺[\s\S]*热点方向证据不完整/,
    'an available status without a complete evidence group must remain unavailable'
  )
  assert.doesNotMatch(
    incompleteEvidenceText,
    /NaN|undefined/,
    'incomplete direction evidence must not render invalid values'
  )
  await incompleteEvidencePage.close()

  const unavailablePage = await openLofOverview(browser, {
    hot_direction: {
      status: 'unavailable',
      reason: '有效正溢价分类样本不足',
      name: null,
      method: '成交额加权正溢价',
      weighted_premium: null,
      sample_count: 0,
      unclassified_count: 2,
      constituents: [],
      as_of: '2026-07-25',
      source: 'LOF 主题分类表',
      retrieved_at: '2026-07-25T15:30:00+08:00'
    },
    daily_subscription: {
      status: 'unavailable',
      reason: '暂无经核验的日度数据'
    }
  })
  const unavailableText = await unavailablePage
    .locator('.market-overview')
    .innerText()
  assert.match(
    unavailableText,
    /暂缺/,
    'missing direction must remain unavailable rather than become zero'
  )
  assert.match(
    unavailableText,
    /有效正溢价分类样本不足 · 未分类2只/,
    'overview should explain the unavailable direction reason and coverage'
  )
  await unavailablePage.close()
} finally {
  await browser.close()
}
