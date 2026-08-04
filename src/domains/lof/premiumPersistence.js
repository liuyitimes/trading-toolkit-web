export function normalizePremiumPersistence(raw) {
  const value = raw?.consecutive_positive_sessions
  const validCount = Number.isInteger(value) && value >= 0

  if (raw?.status === 'complete' && validCount) {
    return {
      consecutivePremium: value,
      consecutivePremiumText: `${value}天`,
      consecutivePremiumReason: null,
      premiumPersistenceStatus: 'complete',
      isPartialPremiumPersistence: false,
      isUnavailablePremiumPersistence: false
    }
  }

  if (raw?.status === 'partial' && validCount) {
    return {
      consecutivePremium: value,
      consecutivePremiumText: `至少 ${value} 天`,
      consecutivePremiumReason: raw.reason || '历史不足',
      premiumPersistenceStatus: 'partial',
      isPartialPremiumPersistence: true,
      isUnavailablePremiumPersistence: false
    }
  }

  return {
    consecutivePremium: null,
    consecutivePremiumText: '--',
    consecutivePremiumReason: raw?.reason || '连续正溢价历史暂不可用',
    premiumPersistenceStatus: 'unavailable',
    isPartialPremiumPersistence: false,
    isUnavailablePremiumPersistence: true
  }
}
