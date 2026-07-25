import assert from 'node:assert/strict'
import {
  buildPlacementExportFilename,
  renderPlacementExportDocument
} from '../src/utils/placementExport.js'

const candidate = {
  stockName: '测试股份',
  stockCode: '600000',
  bondName: '测试转债',
  bondCode: '110000',
  exchange: '沪',
  progress: '申购中',
  regDate: '2026-07-24',
  issueSize: '12.50亿元',
  rating: 'AA+',
  shareholderRatio: '65.0%',
  conversionPrice: '12.34',
  stockPrice: '10.00',
  stockChange: '+1.20%',
  cashRatio: '5.00元',
  perShare: '0.5000元',
  sharesFor10: '2000股',
  costPerLot: '20000元',
  actualSharesFor1Lot: '2000股（20手）',
  oneHandMinCost: '12000元',
  expectedProfit: '400元',
  safetyPad: '2.00%',
  strategyScore: 72,
  strategyRating: '关注',
  tradableAmount: '4.38亿元',
  placementPremiumRate: 40,
  _perShareRaw: 0.5,
  _sharesFor10Raw: 2000,
  _stockPriceRaw: 10,
  _costPerLotRaw: 20000,
  _compositeRankRaw: 72,
  detail: {
    stockTrend: '+2.00%',
    recordPrice: '9.80',
    ma20Price: '9.50',
    onlineIssueSize: '3.20亿元',
    winRate: '0.120%',
    stageList: [
      { name: '董事会预案', date: '2026-01-01' },
      { name: '申购日', date: '2026-07-25' }
    ]
  }
}

assert.equal(
  buildPlacementExportFilename(candidate, new Date('2026-07-23T08:00:00Z')),
  '配债详情-测试股份（600000）-2026-07-23.md'
)

const withoutPlacementProvenance = renderPlacementExportDocument({
  candidate,
  snapshotMeta: {
    freshness_state: 'stale',
    data_as_of: '2026-07-23T07:00:00Z',
    stale_reason: '上游延迟',
    verification_state: 'unverified',
    review_required: true
  },
  exportedAt: new Date('2026-07-23T08:00:00Z')
})

assert.match(withoutPlacementProvenance, /配债为规划观察，非确认收益/)
assert.match(withoutPlacementProvenance, /预期上市溢价假设：40%/)
assert.match(withoutPlacementProvenance, /1 至 5 手成本测算/)
assert.ok(
  withoutPlacementProvenance.indexOf('## 配债来源信息') <
    withoutPlacementProvenance.lastIndexOf('未提供')
)
assert.match(withoutPlacementProvenance, /数据新鲜度：延迟/)
assert.match(withoutPlacementProvenance, /需复核：是/)
assert.match(withoutPlacementProvenance, /综合排序分 \| 72/)

const withPlacementProvenance = renderPlacementExportDocument({
  candidate: {
    ...candidate,
    placementProvenance: {
      eligibility: '原股东可参与配售',
      allocation_terms: '每股配售 0.5000 元面值',
      payment_timing: '申购日缴款',
      announcement_date: '2026-07-20',
      announcement_url: 'https://example.com/announcement',
      verified_at: '2026-07-22T10:00:00Z',
      review_required: false
    }
  },
  snapshotMeta: { freshness_state: 'fresh', verification_state: 'verified' },
  exportedAt: new Date('2026-07-23T08:00:00Z')
})

assert.match(withPlacementProvenance, /原股东可参与配售/)
assert.match(withPlacementProvenance, /https:\/\/example\.com\/announcement/)
assert.match(withPlacementProvenance, /核验状态：已核验/)

const legacyDocument = renderPlacementExportDocument({
  candidate,
  snapshotMeta: null,
  exportedAt: new Date('2026-07-23T08:00:00Z')
})
assert.match(legacyDocument, /核验状态：未提供/)
assert.match(legacyDocument, /需复核：未提供/)

console.log('placement export document tests passed')
