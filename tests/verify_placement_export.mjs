import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const webUrl = process.env.WEB_URL || 'http://127.0.0.1:5175'

const enrichedCandidate = {
  stock_name: 'ExportAlpha',
  stock_code: '600001',
  bond_name: 'Alpha Bond',
  bond_code: '110001',
  status: '申购中',
  progress: '申购中',
  issue_size: 1,
  tradable_amount: 0.1,
  stock_price: 10,
  shares_for_10_lots: 1000,
  per_share_allocation: 1,
  placement_provenance: {
    eligibility: '原股东可参与配售',
    allocation_terms: '每股配售 1 元面值',
    announcement_url: 'https://example.com/alpha-announcement',
    review_required: false
  }
}

const legacyCandidate = {
  stock_name: 'LegacyBeta',
  stock_code: '600002',
  bond_name: 'Beta Bond',
  bond_code: '110002',
  status: '申购中',
  progress: '申购中',
  issue_size: 0.5,
  tradable_amount: 0.05,
  stock_price: 8,
  shares_for_10_lots: 500,
  per_share_allocation: 2
}

let pendingResponse = {
  items: [enrichedCandidate],
  meta: {
    freshness_state: 'fresh',
    verification_state: 'verified',
    data_as_of: '2026-07-23T08:00:00Z'
  }
}

async function downloadText(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 }
})
const page = await context.newPage()
const browserErrors = []

page.on('pageerror', (error) => browserErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})

await page.route('**/api/v1/**', async (route) => {
  const { pathname } = new URL(route.request().url())
  let data = {}
  if (pathname.endsWith('/convertible/pending')) {
    data = pendingResponse
  }
  if (pathname.endsWith('/convertible/signals')) {
    data = {
      double_low: [],
      force_redeem: [],
      discount: [],
      down_revised: []
    }
  }
  if (pathname.endsWith('/convertible/list')) data = { items: [], total: 0 }
  if (pathname.endsWith('/convertible/temperature')) data = {}
  if (pathname.endsWith('/market/overview')) data = { convertible_bond: {} }

  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, meta: {} })
  })
})

try {
  await page.goto(`${webUrl}/convertible`, { waitUntil: 'networkidle' })
  await page.locator('.desktop-table .el-table__row').first().waitFor()

  await page.evaluate(async () => {
    const { useConvertibleStore } = await import('/src/stores/convertible.js')
    useConvertibleStore().setPlacementPremiumRate(40)
  })

  const alphaRow = page
    .locator('.desktop-table .el-table__row')
    .filter({ hasText: 'ExportAlpha' })
  const desktopDownload = page.waitForEvent('download')
  await alphaRow.locator('[data-testid="placement-export-button"]').click()
  const alphaDownload = await desktopDownload
  assert.match(
    alphaDownload.suggestedFilename(),
    /^配债详情-ExportAlpha（600001）-\d{4}-\d{2}-\d{2}\.md$/
  )
  const alphaText = await downloadText(alphaDownload)
  assert.match(alphaText, /https:\/\/example\.com\/alpha-announcement/)
  assert.match(alphaText, /预期上市溢价假设：40%/)
  assert.equal(
    await page.locator('.pending-dialog:visible').count(),
    0,
    'desktop export must not open the placement detail dialog'
  )

  pendingResponse = [legacyCandidate]
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  const legacyCard = page
    .locator('.mobile-cards .mobile-card')
    .filter({ hasText: 'LegacyBeta' })
  await legacyCard.waitFor()
  const mobileDownload = page.waitForEvent('download')
  await legacyCard.locator('[data-testid="placement-export-button"]').click()
  const betaDownload = await mobileDownload
  assert.match(
    betaDownload.suggestedFilename(),
    /^配债详情-LegacyBeta（600002）-\d{4}-\d{2}-\d{2}\.md$/
  )
  const betaText = await downloadText(betaDownload)
  assert.match(betaText, /核验状态：未提供/)
  assert.match(betaText, /需复核：未提供/)
  assert.equal(
    await page.locator('.pending-dialog:visible').count(),
    0,
    'mobile export must not open the placement detail dialog'
  )

  assert.deepEqual(
    browserErrors,
    [],
    'placement export should not raise browser errors'
  )
} finally {
  await context.close()
  await browser.close()
}
