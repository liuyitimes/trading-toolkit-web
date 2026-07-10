import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

await page.goto('http://localhost:5173/convertible')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2000)

// 切换到配售 Tab
const placementTab = page.locator('button.tab-btn:has-text("配售")')
if (await placementTab.count() > 0) {
  await placementTab.first().click()
  await page.waitForTimeout(1500)
}

// 截图
await page.screenshot({ path: 'test_screenshots/convertible_placement.png', fullPage: true })

// 检查排序按钮
const sortButtons = page.locator('.sort-btn')
const sortCount = await sortButtons.count()
console.log('=== 排序按钮 ===')
for (let i = 0; i < sortCount; i++) {
  console.log(`  [${i}] ${await sortButtons.nth(i).innerText()}`)
}

// 检查 progress-tag 内容
const progressTags = page.locator('.progress-tag')
const tagCount = await progressTags.count()
console.log(`\n=== progress-tag 内容 (共 ${tagCount} 个) ===`)
for (let i = 0; i < Math.min(tagCount, 5); i++) {
  const text = await progressTags.nth(i).innerText()
  const html = await progressTags.nth(i).innerHTML()
  const hasHtml = html.includes('<br') || html.includes('<span')
  console.log(`  [${i}] text=${JSON.stringify(text)} | has_html_tags=${hasHtml}`)
}

// 检查登记日徽章
const regBadges = page.locator('span.el-tag:has-text("登记")')
const badgeCount = await regBadges.count()
console.log(`\n=== 登记日徽章 (共 ${badgeCount} 个) ===`)
for (let i = 0; i < Math.min(badgeCount, 5); i++) {
  console.log(`  [${i}] ${await regBadges.nth(i).innerText()}`)
}

// 检查表格行数据
const rows = page.locator('.desktop-table .el-table__row')
const rowCount = await rows.count()
console.log(`\n=== 表格行数: ${rowCount} ===`)
if (rowCount > 0) {
  const firstRow = rows.first()
  const nameCell = firstRow.locator('.name-cell')
  const nameText = await nameCell.innerText()
  console.log(`  第一行: ${nameText.substring(0, 100)}`)
}

console.log(`\n=== Console 错误数: ${consoleErrors.length} ===`)
consoleErrors.forEach(err => console.log(`  ${err}`))

await browser.close()
console.log('\n验证完成')
