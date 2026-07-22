import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5173'
const storageKey = 'convertiblePlacementPremiumRate'

const pendingPayload = [
  {
    stock_name: '甲公司',
    stock_code: '600001',
    bond_name: '甲转债',
    bond_code: '110001',
    issue_size: 4,
    tradable_amount: 2,
    stock_price: 10,
    stock_change: 0,
    shares_for_10_lots: 1000,
    per_share_allocation: 1,
    expected_profit: 999,
    safety_pad: 88,
    strategy_score: 100,
    strategy_rating: 'recommend',
    status: '待上市'
  },
  {
    stock_name: '乙公司',
    stock_code: '600002',
    bond_name: '乙转债',
    bond_code: '110002',
    issue_size: 1,
    tradable_amount: 0.2,
    stock_price: 10,
    stock_change: 0,
    shares_for_10_lots: 10000,
    per_share_allocation: 0.1,
    expected_profit: 999,
    safety_pad: 88,
    strategy_score: 100,
    strategy_rating: 'recommend',
    status: '待上市'
  }
]

async function installApiMocks(page) {
  await page.route('**/api/v1/convertible/pending', (route) =>
    route.fulfill({ json: { success: true, data: pendingPayload } })
  )
  await page.route('**/api/v1/convertible/signals', (route) =>
    route.fulfill({ json: { success: true, data: {} } })
  )
  await page.route('**/api/v1/convertible/list**', (route) =>
    route.fulfill({ json: { success: true, data: { items: [], total: 0 } } })
  )
  await page.route('**/api/v1/market/overview', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          convertible_bond: {
            count: 0,
            price_median: '--',
            premium_median: '--',
            double_low_median: '--',
            market_status: '测试'
          }
        }
      }
    })
  )
}

async function openPlacement(page) {
  await page.goto(`${webUrl}/convertible`, { waitUntil: 'networkidle' })
  await page
    .locator('.desktop-table .el-table__row')
    .first()
    .waitFor({ state: 'attached' })
}

async function selectPremiumRate(page, rate) {
  await page.locator('[data-testid="placement-assumption"] .el-select').click()
  await page.getByText(`${rate}%`, { exact: true }).last().click()
}

async function firstPlacementName(page) {
  return page
    .locator('.desktop-table .el-table__row .bond-name')
    .first()
    .innerText()
}

async function openFirstPlacementDetail(page) {
  await page.locator('.desktop-table .el-table__row .name-cell').first().click()
  await page.locator('.pending-dialog').waitFor()
  return page.locator('.pending-dialog').innerText()
}

async function closePlacementDetail(page) {
  await page.locator('.pending-dialog .el-dialog__headerbtn').click()
  await page.locator('.pending-dialog').waitFor({ state: 'hidden' })
  await page.waitForTimeout(250)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 }
})
const page = await context.newPage()

try {
  await installApiMocks(page)
  await page.addInitScript((key) => {
    const initializedKey = `${key}:verification-initialized`
    if (!window.sessionStorage.getItem(initializedKey)) {
      window.localStorage.removeItem(key)
      window.sessionStorage.setItem(initializedKey, 'true')
    }
  }, storageKey)
  await openPlacement(page)

  assert.equal(
    await page
      .locator('[data-testid="placement-assumption"]')
      .innerText()
      .then((text) => text.includes('按 30% 假设')),
    true
  )
  assert.equal(await firstPlacementName(page), '乙公司')
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('999元')),
    false
  )
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('88.00%')),
    false
  )
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('3.00%')),
    true
  )
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('谨慎')),
    true
  )
  assert.equal(
    await openFirstPlacementDetail(page).then((text) => text.includes('300元')),
    true
  )
  await closePlacementDetail(page)

  await selectPremiumRate(page, 100)
  await page.waitForTimeout(100)
  assert.equal(await firstPlacementName(page), '甲公司')
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('10.00%')),
    true
  )
  assert.equal(
    await page
      .locator('.desktop-table')
      .innerText()
      .then((text) => text.includes('谨慎')),
    false
  )
  await page.screenshot({
    path: 'tests/screenshots/placement-yield-assumption-desktop.png',
    fullPage: true
  })

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()
  assert.equal(
    await page
      .locator('[data-testid="placement-assumption"]')
      .innerText()
      .then((text) => text.includes('按 100% 假设')),
    true
  )

  await page.locator('[aria-label="恢复默认 30%"]').click()
  await page.waitForTimeout(100)
  assert.equal(
    await page
      .locator('[data-testid="placement-assumption"]')
      .innerText()
      .then((text) => text.includes('按 30% 假设')),
    true
  )
  assert.equal(
    await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
    '30'
  )

  await page.evaluate(
    (key) => window.localStorage.setItem(key, '25'),
    storageKey
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()
  assert.equal(
    await page
      .locator('[data-testid="placement-assumption"]')
      .innerText()
      .then((text) => text.includes('按 30% 假设')),
    true
  )

  await page.getByRole('button', { name: '双低' }).click()
  assert.equal(
    await page.locator('[data-testid="placement-assumption"]').count(),
    0
  )

  const mobilePage = await context.newPage()
  await installApiMocks(mobilePage)
  await mobilePage.setViewportSize({ width: 390, height: 844 })
  await openPlacement(mobilePage)
  await mobilePage
    .locator('.mobile-cards .placement-assumption-note')
    .first()
    .waitFor()
  const resetButton = mobilePage.locator('[aria-label="恢复默认 30%"]')
  await resetButton.waitFor()
  assert.equal(await resetButton.isVisible(), true)
  const [resetBox, floatingToolbarBox] = await Promise.all([
    resetButton.boundingBox(),
    mobilePage.locator('.float-toolbar').boundingBox()
  ])
  if (resetBox && floatingToolbarBox) {
    const overlaps =
      resetBox.x < floatingToolbarBox.x + floatingToolbarBox.width &&
      resetBox.x + resetBox.width > floatingToolbarBox.x &&
      resetBox.y < floatingToolbarBox.y + floatingToolbarBox.height &&
      resetBox.y + resetBox.height > floatingToolbarBox.y
    assert.equal(overlaps, false)
  }
  assert.equal(
    await mobilePage
      .locator('.mobile-cards .placement-assumption-note')
      .first()
      .innerText(),
    '按 30% 假设'
  )
  await mobilePage.screenshot({
    path: 'tests/screenshots/placement-yield-assumption-mobile.png',
    fullPage: true
  })
  await mobilePage.close()

  console.log('placement-yield-assumption verification passed')
} finally {
  await browser.close()
}
