import assert from 'node:assert/strict'
import { normalizePremiumPersistence } from '../src/domains/lof/premiumPersistence.js'

assert.deepEqual(
  normalizePremiumPersistence({
    consecutive_positive_sessions: 0,
    status: 'complete',
    reason: null
  }),
  {
    consecutivePremium: 0,
    consecutivePremiumText: '0天',
    consecutivePremiumReason: null,
    premiumPersistenceStatus: 'complete',
    isPartialPremiumPersistence: false,
    isUnavailablePremiumPersistence: false
  }
)

const partial = normalizePremiumPersistence({
  consecutive_positive_sessions: 3,
  status: 'partial',
  reason: '连续序列触及历史覆盖起点 2026-01-01，历史不足'
})
assert.equal(partial.consecutivePremiumText, '至少 3 天')
assert.equal(
  partial.consecutivePremiumReason,
  '连续序列触及历史覆盖起点 2026-01-01，历史不足'
)

const unavailable = normalizePremiumPersistence(null)
assert.equal(unavailable.consecutivePremiumText, '--')
assert.equal(unavailable.consecutivePremium, null)
