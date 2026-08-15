/**
 * LOF 连续正溢价持续性归一化。
 *
 * 配套 Service 变更返回的 `premium_persistence` 对象同时表达已观测天数
 * 与可信度：`complete`（真实 N 天或真实零天）、`partial`（至少 N 天且
 * 历史不足）、`unavailable`（不可用，天数为 null）。客户端不得把缺失或
 * 历史不足压缩为真实的零天。
 */

export function normalizePremiumPersistence(raw) {
  if (!raw || typeof raw !== 'object') return null
  const sessions = raw.consecutive_positive_sessions
  const consecutivePremium =
    typeof sessions === 'number' && Number.isFinite(sessions) ? sessions : null
  const status = ['complete', 'partial', 'unavailable'].includes(raw.status)
    ? raw.status
    : 'unavailable'
  return {
    consecutivePremium,
    status,
    reason: raw.reason || null,
    asOf: raw.as_of || null,
    historyStartedOn: raw.history_started_on || null
  }
}

export function formatPremiumPersistenceText(persistence) {
  if (!persistence) return '--'
  if (
    persistence.status === 'unavailable' ||
    persistence.consecutivePremium == null
  )
    return '--'
  if (persistence.status === 'partial')
    return `至少 ${persistence.consecutivePremium} 天`
  return `${persistence.consecutivePremium} 天`
}

export function premiumPersistenceTip(persistence) {
  if (!persistence) return null
  if (persistence.status === 'partial')
    return `历史不足：${persistence.reason || '缺少更早历史记录'}`
  if (persistence.status === 'unavailable')
    return `不可用：${persistence.reason || '当前交易日无同日可比观测'}`
  return null
}

export function isSustainedPremium(persistence) {
  return (
    !!persistence &&
    persistence.status === 'complete' &&
    persistence.consecutivePremium != null &&
    persistence.consecutivePremium >= 5
  )
}
