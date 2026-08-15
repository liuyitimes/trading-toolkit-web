const UNAVAILABLE_TEXT = '--'

function normalizeTiming(value) {
  const rawStatus = ['verified', 'stale'].includes(value?.status)
    ? value.status
    : 'unavailable'
  const source =
    value?.source && typeof value.source === 'object'
      ? {
          title:
            typeof value.source.title === 'string' ? value.source.title : '',
          url: typeof value.source.url === 'string' ? value.source.url : '',
          effectiveDate: value.source.effective_date || '',
          verifiedAt: value.source.verified_at || ''
        }
      : null
  const hasTraceableEvidence = Boolean(
    source?.title && source.url && source.effectiveDate && source.verifiedAt
  )
  const status =
    rawStatus === 'verified' && !hasTraceableEvidence
      ? 'unavailable'
      : rawStatus
  const timingText =
    status !== 'unavailable' &&
    typeof value?.timing_text === 'string' &&
    value.timing_text.trim()
      ? value.timing_text.trim()
      : UNAVAILABLE_TEXT

  return {
    status,
    timingText,
    source,
    isVerified: status === 'verified' && timingText !== UNAVAILABLE_TEXT,
    isStale: status === 'stale',
    statusText:
      status === 'verified' ? '已核验' : status === 'stale' ? '陈旧' : '暂缺'
  }
}

function normalizeMinimum(value) {
  const rawStatus = ['verified', 'stale'].includes(value?.status)
    ? value.status
    : 'unavailable'
  const source =
    value?.source && typeof value.source === 'object'
      ? {
          title:
            typeof value.source.title === 'string' ? value.source.title : '',
          url: typeof value.source.url === 'string' ? value.source.url : '',
          effectiveDate: value.source.effective_date || '',
          verifiedAt: value.source.verified_at || ''
        }
      : null
  const hasTraceableEvidence = Boolean(
    source?.title && source.url && source.effectiveDate && source.verifiedAt
  )
  const status =
    rawStatus === 'verified' && !hasTraceableEvidence
      ? 'unavailable'
      : rawStatus
  const displayText =
    status !== 'unavailable' &&
    typeof value?.display_text === 'string' &&
    value.display_text.trim()
      ? value.display_text.trim()
      : UNAVAILABLE_TEXT

  return {
    status,
    displayText,
    source,
    isVerified: status === 'verified' && displayText !== UNAVAILABLE_TEXT,
    isStale: status === 'stale',
    statusText:
      status === 'verified' ? '已核验' : status === 'stale' ? '陈旧' : '暂缺'
  }
}

export function normalizeLofSettlementTiming(value) {
  const subscriptionConfirmation = normalizeTiming(
    value?.subscription_confirmation
  )
  const redemptionPayment = normalizeTiming(value?.redemption_payment)

  return {
    subscriptionConfirmation,
    redemptionPayment,
    compactText: `申 ${subscriptionConfirmation.timingText} / 赎 ${redemptionPayment.timingText}`,
    isComplete:
      subscriptionConfirmation.isVerified && redemptionPayment.isVerified,
    hasStale: subscriptionConfirmation.isStale || redemptionPayment.isStale
  }
}

export function normalizeLofMinimumOrder(value) {
  const subscription = normalizeMinimum(value?.subscription)
  const redemption = normalizeMinimum(value?.redemption)

  return {
    subscription,
    redemption,
    compactText: `申 ${subscription.displayText} / 赎 ${redemption.displayText}`,
    isComplete: subscription.isVerified && redemption.isVerified,
    hasStale: subscription.isStale || redemption.isStale
  }
}
