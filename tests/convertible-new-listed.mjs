import assert from 'node:assert/strict'
import { normalizeNewListedItem } from '../src/domain/convertibleNewListed.js'

const listedDayOne = normalizeNewListedItem({
  bond_code: '123456',
  bond_name: '测试转债',
  stock_code: '300001',
  stock_name: '测试股份',
  list_date: '2026-08-03',
  price: 126.66,
  latest_close: 126.66,
  latest_trade_date: '2026-08-03',
  listing_close: 126.66,
  gain_since_listing: 0,
  change_pct: 12.34,
  premium_rate: 18.9,
  issue_size: 4.5,
  turnover_rate: 23.45
})

assert.equal(listedDayOne.exchange, '深')
assert.equal(listedDayOne.gainSinceListing, '+0.00%')
assert.equal(listedDayOne.issueSize, '4.50亿')
assert.equal(listedDayOne.turnoverRate, '+23.45%')

const listedMissingMarket = normalizeNewListedItem({
  bond_code: '113999',
  bond_name: '缺失行情转债',
  stock_code: '600001',
  stock_name: '缺失股份',
  list_date: '2026-07-27',
  latest_close: 132.5,
  listing_close: 121,
  gain_since_listing: 9.5
})

assert.equal(listedMissingMarket.exchange, '沪')
assert.equal(listedMissingMarket.latestPrice, '132.50')
assert.equal(listedMissingMarket.listingClose, '121.00')
assert.equal(listedMissingMarket.issueSize, '--')
assert.equal(listedMissingMarket.turnoverRate, '--')
assert.equal(listedMissingMarket.gainSinceListing, '+9.50%')

console.log('convertible new listed normalization tests passed')
