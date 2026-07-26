import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []

page.on('pageerror', (error) => errors.push(error.message))
await page.route('**/api/v1/**', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {}, meta: {} })
  })
)

try {
  await page.goto(`${webUrl}/home`, { waitUntil: 'networkidle' })
  await page.locator('#app').waitFor()
  assert.ok((await page.locator('#app').innerText()).trim().length > 0)
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
