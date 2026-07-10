// 验证时间轴与节点卡片间距已修复
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()
const errors = []
const failed = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
page.on('requestfailed', (r) => { if (!r.url().includes('favicon')) failed.push(r.url()) })

await page.goto('http://localhost:5173/convertible', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

const placeTab = page.locator('text=配售中').first()
if (await placeTab.count() > 0) { await placeTab.click(); await page.waitForTimeout(2000) }

const firstRow = page.locator('.el-table__row').first()
if (await firstRow.count() > 0) { await firstRow.click(); await page.waitForSelector('.detail-timeline', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(800) }

// 测量时间轴底部与当前节点卡片顶部的距离
const measurements = await page.evaluate(() => {
  const timeline = document.querySelector('.detail-timeline')
  const stageInfo = document.querySelector('.stage-progress-info')
  if (!timeline || !stageInfo) return { error: 'elements not found' }

  const tlRect = timeline.getBoundingClientRect()
  const siRect = stageInfo.getBoundingClientRect()
  // 找到时间轴内最底部的子元素（最后一个节点的 label）
  const lastNode = timeline.querySelectorAll('.timeline-node')
  const lastRect = lastNode[lastNode.length - 1].getBoundingClientRect()
  const lastLabelRect = lastNode[lastNode.length - 1].querySelector('.timeline-label').getBoundingClientRect()
  return {
    timelineBottom: tlRect.bottom,
    lastLabelBottom: lastLabelRect.bottom,
    stageInfoTop: siRect.top,
    gap: siRect.top - lastLabelRect.bottom,
    timelineMarginBottom: getComputedStyle(timeline).marginBottom,
    timelinePaddingBottom: getComputedStyle(timeline).paddingBottom,
  }
})
console.log('=== 间距测量 ===')
console.log(measurements)

const dialog = page.locator('.el-dialog__body').first()
if (await dialog.count() > 0) {
  await dialog.screenshot({ path: 'test_screenshots/timeline_gap_fixed.png' })
  console.log('截图: test_screenshots/timeline_gap_fixed.png')
}

console.log('\n=== Errors:', errors.length, 'Failed:', failed.length, '===')
errors.forEach((e) => console.log(' ', e))
failed.forEach((u) => console.log(' ', u))

await browser.close()
process.exit(errors.length > 0 || failed.length > 0 ? 1 : 0)
