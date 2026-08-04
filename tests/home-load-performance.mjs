import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage()
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/market/overview')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { convertible_bond: { count: 512 }, lof_fund: { count: 274 } }
        })
      })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} })
    })
  })
  await page.goto(`${webUrl}/`, { waitUntil: 'domcontentloaded' })
  await page.getByText('512', { exact: true }).waitFor({ timeout: 900 })
  assert.equal(await page.getByText('274', { exact: true }).count(), 1)
} finally {
  await browser.close()
}
