// 验证收紧语义 + 已配售持仓区块
import { chromium } from 'playwright'

const errors = []
const failed = []
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on(
  'console',
  (m) => m.type() === 'error' && errors.push('console: ' + m.text())
)
page.on('requestfailed', (r) => {
  if (!r.url().includes('favicon')) failed.push(r.url())
})

await page.goto('http://localhost:5173/convertible', {
  waitUntil: 'domcontentloaded'
})
await page.waitForTimeout(3000)

// 直接拿整个 active tab 内容
const data = await page.evaluate(() => {
  const heldCard = document.querySelector('.held-card')
  const heldRows = document.querySelectorAll('.held-row')
  const placementRows = document.querySelectorAll('.el-table__row')
  const subBtns = Array.from(document.querySelectorAll('.sub-btn')).map((b) =>
    b.textContent?.replace(/\s+/g, ' ').trim()
  )
  return {
    hasHeldCard: !!heldCard,
    heldCardTitle: heldCard
      ?.querySelector('.held-card-title')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim(),
    heldRowCount: heldRows.length,
    heldRows: Array.from(heldRows).map((r) =>
      r.textContent?.replace(/\s+/g, ' ').trim().slice(0, 100)
    ),
    placementRowCount: placementRows.length,
    placementRows: Array.from(placementRows).map((r) =>
      r.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80)
    ),
    subBtns
  }
})
console.log(JSON.stringify(data, null, 2))

await page.screenshot({
  path: 'tests/screenshots/held_card.png',
  fullPage: false
})
console.log('\n截图: tests/screenshots/held_card.png')

console.log('\nErrors:', errors.length, 'Failed:', failed.length)
errors.forEach((e) => console.log(' ', e))
failed.forEach((u) => console.log(' ', u))

await browser.close()
process.exit(errors.length > 0 || failed.length > 0 ? 1 : 0)
