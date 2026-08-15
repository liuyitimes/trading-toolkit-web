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
  three_day_price: 126.66,
  three_day_price_date: '2026-08-03',
  three_day_stage: 1,
  gain_since_listing: 26.66,
  three_day_gain: 26.66,
  change_pct: 12.34,
  premium_rate: 18.9,
  issue_size: 4.5,
  turnover_rate: 23.45
})

assert.equal(listedDayOne.exchange, '深')
assert.equal(listedDayOne.gainSinceListing, '+26.66%')
assert.equal('monthBaseClose' in listedDayOne, false)
assert.equal('monthGain' in listedDayOne, false)
assert.equal(listedDayOne.threeDayStage, 1)
assert.equal(listedDayOne.threeDayGain, '+26.66%')
assert.equal(listedDayOne.threeDayPrice, '126.66')
assert.equal(listedDayOne.issueSize, '4.50亿')
assert.equal(listedDayOne.turnoverRate, '+23.45%')

const listedMissingMarket = normalizeNewListedItem({
  bond_code: '113999',
  bond_name: '缺失行情转债',
  stock_code: '600001',
  stock_name: '缺失股份',
  list_date: '2026-07-27',
  latest_close: 132.5,
  three_day_price: 130,
  three_day_price_date: '2026-07-29',
  three_day_stage: 3,
  gain_since_listing: 9.5,
  three_day_gain: 30
})

assert.equal(listedMissingMarket.exchange, '沪')
assert.equal(listedMissingMarket.latestPrice, '132.50')
assert.equal('listingClose' in listedMissingMarket, false)
assert.equal('monthBaseClose' in listedMissingMarket, false)
assert.equal('monthGain' in listedMissingMarket, false)
assert.equal(listedMissingMarket.threeDayStage, 3)
assert.equal(listedMissingMarket.threeDayGain, '+30.00%')
assert.equal(listedMissingMarket.issueSize, '--')
assert.equal(listedMissingMarket.turnoverRate, '--')
assert.equal(listedMissingMarket.gainSinceListing, '+9.50%')

console.log('convertible new listed normalization tests passed')
