import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'
const SLOW_RESPONSE_MS = 2500
const FIRST_CONTENT_BUDGET_MS = 1000

function response(data) {
  return {
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, meta: {} })
  }
}

async function settleFirstContent(page, storePath, assertion) {
  const started = performance.now()
  await page.waitForFunction(
    async ({ storePath, assertion }) => {
      const module = await import(storePath)
      return assertion === 'lof'
        ? !module.useLofStore().loading &&
            module.useLofStore().fundList.length === 1
        : !module.useConvertibleStore().loading
    },
    { storePath, assertion }
  )
  return performance.now() - started
}

async function settleConvertibleTemperature(page) {
  await page.waitForFunction(async () => {
    const module = await import('/src/stores/convertible.js')
    return module.useConvertibleStore().marketTemp?.priceMedian === 120.5
  })
}

const browser = await chromium.launch({ headless: true })

try {
  const lofPage = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  })
  await lofPage.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/lof/summary')) {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
      await route.fulfill(response({ count: 1 }))
      return
    }
    if (pathname.endsWith('/lof/list')) {
      await route.fulfill(
        response({
          items: [
            {
              name: '首屏 LOF',
              code: '501999',
              exchange: 'sh',
              price: 1.08,
              valuation: 1,
              premium: 8,
              amount: 1200,
              volume: 800,
              limit_status: '不限'
            }
          ]
        })
      )
      return
    }
    await route.fulfill(response({}))
  })
  await lofPage.goto(`${webUrl}/lof`, { waitUntil: 'domcontentloaded' })
  const lofElapsed = await settleFirstContent(
    lofPage,
    '/src/stores/lof.js',
    'lof'
  )
  assert.ok(
    lofElapsed < FIRST_CONTENT_BUDGET_MS,
    `LOF 首屏不应等待慢摘要接口，实际 ${Math.round(lofElapsed)}ms`
  )
  await lofPage.close()

  const convertiblePage = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  })
  const convertibleListRequest = convertiblePage.waitForRequest((request) =>
    request.url().includes('/api/v1/convertible/list')
  )
  await convertiblePage.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/convertible/signals')) {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
      await route.fulfill(
        response({
          double_low: [],
          force_redeem: [],
          discount: [],
          down_revised: []
        })
      )
      return
    }
    if (pathname.endsWith('/market/overview')) {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
      await route.fulfill(response({ convertible_bond: {} }))
      return
    }
    if (pathname.endsWith('/convertible/temperature')) {
      await route.fulfill(
        response({
          count: 302,
          price_median: 120.5,
          premium_median: 32.1,
          double_low_median: 152.6,
          market_status: 'normal'
        })
      )
      return
    }
    if (pathname.endsWith('/convertible/list')) {
      await route.fulfill(response({ items: [], total: 0 }))
      return
    }
    if (pathname.endsWith('/convertible/pending')) {
      await route.fulfill(response([]))
      return
    }
    if (pathname.endsWith('/convertible/new-listed')) {
      await route.fulfill(response([]))
      return
    }
    await route.fulfill(response({}))
  })
  await convertiblePage.goto(`${webUrl}/convertible`, {
    waitUntil: 'domcontentloaded'
  })
  const convertibleElapsed = await settleFirstContent(
    convertiblePage,
    '/src/stores/convertible.js',
    'convertible'
  )
  assert.ok(
    convertibleElapsed < FIRST_CONTENT_BUDGET_MS,
    `可转债首屏不应等待慢信号接口，实际 ${Math.round(convertibleElapsed)}ms`
  )
  await settleConvertibleTemperature(convertiblePage)
  const listRequest = await convertibleListRequest
  const listRequestUrl = new URL(listRequest.url())
  assert.ok(
    listRequestUrl.searchParams.get('page_size') === '500',
    '可转债列表应使用后端约定的 page_size 参数，以命中 500 条预热缓存'
  )
  await convertiblePage.close()
} finally {
  await browser.close()
}
