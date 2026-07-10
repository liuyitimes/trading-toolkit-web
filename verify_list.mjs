// 验证配售列表过滤逻辑重构后行为不变
import { chromium } from 'playwright'

const errors = []
const failed = []
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
page.on('requestfailed', (r) => { if (!r.url().includes('favicon')) failed.push(r.url()) })

await page.goto('http://localhost:5173/convertible', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

const placeTab = page.locator('text=配售中').first()
if (await placeTab.count() > 0) { await placeTab.click(); await page.waitForTimeout(2000) }

const rows = await page.locator('.el-table__row').count()
console.log('配售列表行数:', rows)

const names = await page.locator('.el-table__row').evaluateAll((els) =>
  els.map((e) => e.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80))
)
console.log('--- 行内容 ---')
names.forEach((n, i) => console.log(`  [${i}] ${n}`))

await page.screenshot({ path: 'test_screenshots/pending_list_refactored.png', fullPage: false })
console.log('截图: test_screenshots/pending_list_refactored.png')

console.log('\n=== Errors:', errors.length, 'Failed:', failed.length, '===')
errors.forEach((e) => console.log(' ', e))
failed.forEach((u) => console.log(' ', u))

await browser.close()
process.exit(errors.length > 0 || failed.length > 0 ? 1 : 0)
