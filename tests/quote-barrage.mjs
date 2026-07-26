import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'
const quotes = [
  { text: '名言一', author: '作者一' },
  { text: '名言二', author: '作者二' },
  { text: '名言三', author: '作者三' },
  { text: '名言四', author: '作者四' }
]

const browser = await chromium.launch({ headless: true })
const errors = []
const { context, page } = await createBarragePage(
  { viewport: { width: 1280, height: 800 } },
  quotes,
  errors
)

try {
  await page.goto(`${webUrl}/home`, { waitUntil: 'networkidle' })
  const barrage = page.getByTestId('quote-barrage')
  assert.equal(await barrage.count(), 1)
  const items = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()

  assert.ok(items.length >= 2 && items.length <= 3)
  assert.equal(new Set(items).size, items.length)
  const header = await page.locator('.layout-header').boundingBox()
  const barrageBox = await barrage.boundingBox()
  const main = await page.locator('.layout-main').boundingBox()
  assert.ok(header && barrageBox && main)
  assert.ok(header.y + header.height <= barrageBox.y)
  assert.ok(barrageBox.y + barrageBox.height <= main.y)
  assert.equal(
    await page.evaluate(
      ({ x, y }) => {
        return !document
          .elementFromPoint(x, y)
          ?.closest('[data-testid="quote-barrage"]')
      },
      { x: barrageBox.x + 12, y: barrageBox.y + barrageBox.height / 2 }
    ),
    true
  )

  await page.getByRole('menuitem', { name: '设置' }).click()
  await page.waitForURL('**/settings')
  assert.equal(await barrage.count(), 1)

  await page.getByRole('button', { name: '关闭名言弹幕' }).click()
  assert.equal(await barrage.count(), 0)
  await page.getByRole('menuitem', { name: '首页' }).click()
  await page.waitForURL('**/home')
  assert.equal(await barrage.count(), 0)

  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await barrage.count(), 1)

  await page.getByRole('menuitem', { name: '名言管理' }).click()
  await page.waitForURL('**/quote-manage')
  const currentBatch = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()
  await page.getByRole('button', { name: '添加新名言' }).click()
  await page.locator('.el-dialog textarea').fill('新增名言')
  await page.locator('.el-dialog input').fill('测试作者')
  await page.getByRole('button', { name: '保存' }).click()
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    currentBatch
  )
  await assertBarrageIsHidden({ viewport: { width: 768, height: 800 } })
  await assertBarrageIsHidden({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce'
  })
  await assertBatchUsesAllQuotes([{ text: '单条名言', author: '作者' }])
  await assertBatchUsesAllQuotes([
    { text: '两条名言一', author: '作者一' },
    { text: '两条名言二', author: '作者二' }
  ])
  await assertNextBatchUsesUpdatedQuotes()
  await assertQuoteManagementKeepsCurrentBatch()
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}

async function assertBarrageIsHidden(options) {
  const errors = []
  const { context, page } = await createBarragePage(options, quotes, errors)
  if (options.reducedMotion)
    await page.emulateMedia({ reducedMotion: options.reducedMotion })
  await page.goto(`${webUrl}/home`, { waitUntil: 'networkidle' })
  assert.equal(await page.getByTestId('quote-barrage').isVisible(), false)
  assert.deepEqual(errors, [])
  await context.close()
}

async function assertBatchUsesAllQuotes(expectedQuotes) {
  const errors = []
  const { context, page } = await createBarragePage(
    { viewport: { width: 1280, height: 800 } },
    expectedQuotes,
    errors
  )

  await page.goto(`${webUrl}/home`, { waitUntil: 'networkidle' })
  const items = await page
    .getByTestId('quote-barrage')
    .getByTestId('quote-barrage-item')
    .allTextContents()
  assert.equal(items.length, expectedQuotes.length)
  for (const quote of expectedQuotes)
    assert.ok(items.some((item) => item.includes(quote.text)))
  assert.deepEqual(errors, [])
  await context.close()
}

async function assertNextBatchUsesUpdatedQuotes() {
  const initialQuotes = [{ text: '唯一名言', author: '作者' }]
  const errors = []
  const { context, page } = await createBarragePage(
    { viewport: { width: 1280, height: 800 } },
    initialQuotes,
    errors
  )

  await page.goto(`${webUrl}/home`, { waitUntil: 'networkidle' })
  await page.getByRole('menuitem', { name: '名言管理' }).click()
  await page.waitForURL('**/quote-manage')
  const barrage = page.getByTestId('quote-barrage')
  const currentBatch = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()

  await page.getByRole('button', { name: '添加新名言' }).click()
  await page.locator('.el-dialog textarea').fill('第二条名言')
  await page.locator('.el-dialog input').fill('作者二')
  await page.getByRole('button', { name: '保存' }).click()
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    currentBatch
  )

  await page.getByRole('menuitem', { name: '首页' }).click()
  await page.waitForURL('**/home')
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    currentBatch
  )
  await barrage.locator('.barrage-track').dispatchEvent('animationend')
  await page.waitForTimeout(4100)
  const nextBatch = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()
  assert.equal(nextBatch.length, 2)
  assert.ok(nextBatch.some((item) => item.includes('第二条名言')))
  assert.deepEqual(errors, [])
  await context.close()
}

async function assertQuoteManagementKeepsCurrentBatch() {
  const errors = []
  const initialQuotes = [
    { text: '第一条名言', author: '作者一' },
    { text: '第二条名言', author: '作者二' }
  ]
  const { context, page } = await createBarragePage(
    { viewport: { width: 1280, height: 800 } },
    initialQuotes,
    errors
  )

  await page.goto(`${webUrl}/quote-manage`, { waitUntil: 'networkidle' })
  const barrage = page.getByTestId('quote-barrage')
  const currentBatch = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()

  await page.getByRole('button', { name: '编辑' }).first().click()
  await page.locator('.el-dialog textarea').fill('编辑后的名言')
  await page.getByRole('button', { name: '保存' }).click()
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    currentBatch
  )
  await barrage.locator('.barrage-track').dispatchEvent('animationend')
  await page.waitForTimeout(4100)
  let nextBatch = await barrage
    .getByTestId('quote-barrage-item')
    .allTextContents()
  assert.equal(nextBatch.length, 2)
  assert.ok(nextBatch.some((item) => item.includes('编辑后的名言')))

  await page.getByRole('button', { name: '删除' }).first().click()
  await page.getByRole('button', { name: '确定' }).click()
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    nextBatch
  )
  await barrage.locator('.barrage-track').dispatchEvent('animationend')
  await page.waitForTimeout(4100)
  nextBatch = await barrage.getByTestId('quote-barrage-item').allTextContents()
  assert.equal(nextBatch.length, 1)
  assert.ok(nextBatch[0].includes('第二条名言'))

  await page.getByRole('button', { name: '恢复默认' }).click()
  await page.getByRole('button', { name: '确定' }).click()
  assert.deepEqual(
    await barrage.getByTestId('quote-barrage-item').allTextContents(),
    nextBatch
  )
  await barrage.locator('.barrage-track').dispatchEvent('animationend')
  await page.waitForTimeout(4100)
  nextBatch = await barrage.getByTestId('quote-barrage-item').allTextContents()
  assert.ok(nextBatch.every((item) => !item.includes('第二条名言')))
  assert.deepEqual(errors, [])
  await context.close()
}

async function createBarragePage(options, initialQuotes, errors) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript((items) => {
    localStorage.setItem('trading_toolkit_quotes', JSON.stringify(items))
  }, initialQuotes)
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {}, meta: {} })
    })
  )
  return { context, page }
}
