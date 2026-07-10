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
await page
  .waitForSelector('.detail-timeline', { timeout: 15000 })
  .catch(() => {})
await page.waitForTimeout(2000)

const m = await page.evaluate(() => {
  const timeline = document.querySelector('.detail-timeline')
  const stageInfo = document.querySelector('.stage-progress-info')
  if (!timeline || !stageInfo)
    return {
      error: 'elements not found',
      hasTimeline: !!timeline,
      hasStageInfo: !!stageInfo
    }
  const tlRect = timeline.getBoundingClientRect()
  const siRect = stageInfo.getBoundingClientRect()
  const lastNode = timeline.querySelectorAll('.timeline-node')
  const lastLabelRect = lastNode[lastNode.length - 1]
    .querySelector('.timeline-label')
    .getBoundingClientRect()
  return {
    timelineBottom: Math.round(tlRect.bottom),
    lastLabelBottom: Math.round(lastLabelRect.bottom),
    stageInfoTop: Math.round(siRect.top),
    gap: Math.round(siRect.top - lastLabelRect.bottom),
    timelineMarginBottom: getComputedStyle(timeline).marginBottom,
    timelinePaddingBottom: getComputedStyle(timeline).paddingBottom
  }
})
console.log('=== 间距测量 (直接导航 /convertible) ===')
console.log(m)

await browser.close()
