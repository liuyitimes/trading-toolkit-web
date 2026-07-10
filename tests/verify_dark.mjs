import { chromium } from 'playwright'
import fs from 'fs'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  colorScheme: 'dark'
})
const page = await context.newPage()

await page.goto('http://localhost:5173/convertible')
await page.waitForTimeout(2500)

// ensure dark class set
await page.evaluate(() => {
  document.documentElement.classList.add('dark')
  localStorage.setItem('darkMode', 'true')
})
await page.reload()
await page.waitForTimeout(2500)

const rows = page.locator('.desktop-table .el-table__row')
const row = rows.filter({ hasText: '瑞丰银行' }).first()
const cells = row.locator('.el-table__cell')
const count = await cells.count()
console.log('瑞丰银行 cells count', count)
for (let i = 0; i < count; i++) {
  console.log(`cell[${i}]:`, await cells.nth(i).innerText())
}

const target = cells.nth(3)
await target.hover()
await page.waitForTimeout(800)
const tooltip = page.locator('.el-popper').last()
const tipText = await tooltip.innerText().catch(() => '')
console.log('tooltip text:', tipText.replace(/\n/g, ' | '))
const bColor = await tooltip
  .locator('b')
  .first()
  .evaluate((el) => getComputedStyle(el).color)
const bgColor = await tooltip.evaluate(
  (el) => getComputedStyle(el).backgroundColor
)
console.log('tooltip <b> color:', bColor, 'tooltip bg:', bgColor)
await tooltip.screenshot({ path: 'tests/screenshots/dark_tooltip.png' })

await row.click()
await page.waitForTimeout(500)
const dialog = page.locator('.pending-dialog')
const box = await dialog.boundingBox()
const vh = await page.evaluate(() => window.innerHeight)
console.log(
  'dialog box:',
  box,
  'viewport height:',
  vh,
  'bottom:',
  box ? box.y + box.height : null
)
const body = dialog.locator('.el-dialog__body')
const overflow = await body.evaluate((el) => getComputedStyle(el).overflowY)
const clientHeight = await body.evaluate((el) => el.clientHeight)
const scrollHeight = await body.evaluate((el) => el.scrollHeight)
console.log(
  'dialog body overflowY:',
  overflow,
  'scrollable:',
  scrollHeight > clientHeight
)
await dialog.screenshot({ path: 'tests/screenshots/dark_dialog.png' })

await browser.close()
