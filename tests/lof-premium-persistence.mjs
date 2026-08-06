import assert from 'node:assert/strict'
import {
  formatPremiumPersistenceText,
  isSustainedPremium,
  normalizePremiumPersistence,
  premiumPersistenceTip
} from '../src/domain/lofPremium.js'

const complete = normalizePremiumPersistence({
  consecutive_positive_sessions: 5,
  status: 'complete',
  as_of: '2026-08-06',
  history_started_on: null,
  reason: null
})
assert.equal(complete.status, 'complete')
assert.equal(complete.consecutivePremium, 5)
assert.equal(formatPremiumPersistenceText(complete), '5 天')
assert.equal(premiumPersistenceTip(complete), null)
assert.equal(isSustainedPremium(complete), true)

const realZero = normalizePremiumPersistence({
  consecutive_positive_sessions: 0,
  status: 'complete',
  as_of: '2026-08-06',
  history_started_on: null,
  reason: null
})
assert.equal(formatPremiumPersistenceText(realZero), '0 天')
assert.equal(isSustainedPremium(realZero), false)

const partial = normalizePremiumPersistence({
  consecutive_positive_sessions: 3,
  status: 'partial',
  as_of: '2026-08-06',
  history_started_on: '2026-01-05',
  reason: '历史覆盖不足：最早覆盖日为 2026-01-05'
})
assert.equal(formatPremiumPersistenceText(partial), '至少 3 天')
assert.match(premiumPersistenceTip(partial), /历史不足/)
assert.equal(isSustainedPremium(partial), false)

const unavailable = normalizePremiumPersistence({
  consecutive_positive_sessions: null,
  status: 'unavailable',
  as_of: '2026-08-06',
  history_started_on: null,
  reason: '当前交易日 2026-08-06 无同日可比观测'
})
assert.equal(formatPremiumPersistenceText(unavailable), '--')
assert.equal(unavailable.consecutivePremium, null)
assert.match(premiumPersistenceTip(unavailable), /不可用/)
assert.equal(isSustainedPremium(unavailable), false)

// 缺失字段不得回退为真实零天。
assert.equal(normalizePremiumPersistence(null), null)
assert.equal(formatPremiumPersistenceText(null), '--')
assert.equal(isSustainedPremium(null), false)

const unknownStatus = normalizePremiumPersistence({
  consecutive_positive_sessions: 7,
  status: 'mystery'
})
assert.equal(unknownStatus.status, 'unavailable')
assert.equal(formatPremiumPersistenceText(unknownStatus), '--')

console.log('lof premium persistence tests passed')
