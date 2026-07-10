// 验证时间轴节点日期端到端可见
import { chromium } from 'playwright'

const errors = []
const failedRequests = []

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()

page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console.error: ' + m.text())
})
page.on('requestfailed', (r) => {
  if (!r.url().includes('favicon'))
    failedRequests.push(r.url() + ' :: ' + r.failure()?.errorText)
})

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 导航到可转债 tab
const convertibleTab = page.getByText('可转债', { exact: false }).first()
if ((await convertibleTab.count()) > 0) {
  await convertibleTab.click()
  await page.waitForTimeout(2000)
}

// 查找 "配售中" 或类似标签，点击进入配售列表
const placeTab = page.locator('text=配售中').first()
if ((await placeTab.count()) > 0) {
  await placeTab.click()
  await page.waitForTimeout(2000)
}

// 找到第一只标的可点击
const firstBondRow = page.locator('.el-table__row').first()
const rowExists = await firstBondRow.count()
console.log('table rows:', rowExists)

if (rowExists > 0) {
  await firstBondRow.click()
  await page.waitForTimeout(1500)
}

// 等弹窗 + 时间轴
const timeline = page.locator('.detail-timeline')
const timelineCount = await timeline.count()
console.log('timeline found:', timelineCount)

if (timelineCount > 0) {
  const nodes = await page.locator('.timeline-node').all()
  console.log('--- 时间轴节点 (' + nodes.length + ') ---')
  for (let i = 0; i < nodes.length; i++) {
    const name = await nodes[i].locator('.timeline-name').textContent()
    const date = await nodes[i].locator('.timeline-date').textContent()
    console.log(`  [${i}] ${name?.trim()}  |  ${date?.trim()}`)
  }

  // 截图
  const dialog = page.locator('.el-dialog__body').first()
  if ((await dialog.count()) > 0) {
    await dialog.screenshot({ path: 'tests/screenshots/timeline_dates.png' })
    console.log('截图: tests/screenshots/timeline_dates.png')
  }
}

console.log('\n=== Console errors (' + errors.length + ') ===')
errors.forEach((e) => console.log(' ', e))
console.log('\n=== Failed requests (' + failedRequests.length + ') ===')
failedRequests.forEach((r) => console.log(' ', r))

await browser.close()
process.exit(errors.length > 0 ? 1 : 0)
