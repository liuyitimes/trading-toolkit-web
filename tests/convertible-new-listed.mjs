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
  three_day_price: 126.66,
  three_day_price_date: '2026-08-03',
  three_day_stage: 1,
  gain_since_listing: 0,
  month_gain: null,
  three_day_gain: 26.66,
  change_pct: 12.34,
  premium_rate: 18.9
})

assert.equal(listedDayOne.exchange, '深')
assert.equal(listedDayOne.threeDayStage, 1)
assert.equal(listedDayOne.threeDayGain, '+26.66%')
assert.equal(listedDayOne.threeDayPrice, '126.66')
assert.equal(listedDayOne.monthGain, '--')
assert.equal(listedDayOne.gainSinceListing, '+0.00%')

const listedDayThree = normalizeNewListedItem({
  bond_code: '113999',
  bond_name: '三日转债',
  stock_code: '600001',
  stock_name: '三日股份',
  list_date: '2026-07-27',
  latest_close: 132.5,
  listing_close: 121,
  month_base_close: 118,
  three_day_price: 130,
  three_day_price_date: '2026-07-29',
  three_day_stage: 3,
  gain_since_listing: 9.5,
  month_gain: 12.29,
  three_day_gain: 30
})

assert.equal(listedDayThree.exchange, '沪')
assert.equal(listedDayThree.latestPrice, '132.50')
assert.equal(listedDayThree.threeDayStage, 3)
assert.equal(listedDayThree.threeDayGain, '+30.00%')
assert.equal(listedDayThree.listingClose, '121.00')
assert.equal(listedDayThree.monthBaseClose, '118.00')

console.log('convertible new listed normalization tests passed')
