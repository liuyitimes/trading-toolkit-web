// 详细诊断：当前前端实际过滤逻辑的行为
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('pageerror:', e.message))
page.on(
  'console',
  (m) => m.type() === 'error' && console.log('console.error:', m.text())
)

await page.goto('http://localhost:5173/convertible', {
  waitUntil: 'domcontentloaded'
})
await page.waitForTimeout(3500)

// 等 API 拿到数据
await page
  .waitForFunction(
    () => {
      const rows = document.querySelectorAll('.el-table__row')
      return rows.length > 0
    },
    { timeout: 20000 }
  )
  .catch(() => {})

const detail = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.el-table__row'))
  // 用 Pinia store 拿原始数据
  const app = document.querySelector('#app').__vue_app__
  const store = app?.config?.globalProperties?.$pinia?._s?.get('convertible')
  const raw = store ? store.pendingList : []
  return {
    tableRowCount: rows.length,
    pendingListLen: raw.length,
    pendingListSample: raw.slice(0, 3).map((it) => ({
      name: it.stockName,
      status: it._status,
      regDate: it.regDate,
      applyDate: it._applyDate
    })),
    today: new Date().toISOString().slice(0, 10)
  }
})
console.log(JSON.stringify(detail, null, 2))
await browser.close()
