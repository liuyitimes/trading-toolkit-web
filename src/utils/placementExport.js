const UNAVAILABLE = '未提供'

function valueOrUnavailable(value) {
  return value === undefined || value === null || value === '' || value === '--'
    ? UNAVAILABLE
    : String(value)
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return UNAVAILABLE

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return UNAVAILABLE

  return date.toLocaleString('zh-CN', { hour12: false })
}

function sanitizeFilenamePart(value) {
  const sanitized = String(value || '').replace(
    /[<>:"/\\|?*\u0000-\u001F]/g,
    '_'
  )
  return sanitized || UNAVAILABLE
}

function freshnessLabel(meta = {}) {
  if (meta.freshness_state === 'fresh') return '最新'
  if (meta.freshness_state === 'stale') return '延迟'
  if (meta.freshness_state === 'empty') return '暂无快照'
  return UNAVAILABLE
}

function verificationLabel(provenance = {}, snapshot = {}) {
  const state = provenance.verification_state ?? snapshot.verification_state
  if (state === 'verified') return '已核验'
  if (state === 'unverified') return '未核验'
  return UNAVAILABLE
}

function reviewRequiredLabel(provenance = {}, snapshot = {}) {
  const state = provenance.review_required ?? snapshot.review_required
  if (state === true) return '是'
  if (state === false) return '否'
  return UNAVAILABLE
}

function announcementLink(value) {
  const url = valueOrUnavailable(value)
  return url === UNAVAILABLE ? url : `<${url}>`
}

function costRows(candidate) {
  const sharesPerLot = candidate._sharesFor10Raw || 0
  const stockPrice = candidate._stockPriceRaw || 0

  return Array.from({ length: 5 }, (_, index) => {
    const lots = index + 1
    const theoreticalShares = sharesPerLot * lots
    const actualShares = theoreticalShares
      ? Math.ceil(theoreticalShares / 100) * 100
      : 0
    const cost = actualShares * stockPrice

    return [
      lots,
      valueOrUnavailable(
        candidate._perShareRaw > 0
          ? `${candidate._perShareRaw.toFixed(4)}元`
          : ''
      ),
      valueOrUnavailable(
        theoreticalShares ? `${Math.round(theoreticalShares)}股` : ''
      ),
      valueOrUnavailable(actualShares ? `${actualShares}股` : ''),
      valueOrUnavailable(cost > 0 ? `${Math.round(cost)}元` : '')
    ]
  })
}

function renderTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')
}

function renderProvenance(provenance = {}) {
  const rows = [
    ['参与资格', valueOrUnavailable(provenance.eligibility)],
    ['股权登记日', valueOrUnavailable(provenance.record_date)],
    ['配售条款', valueOrUnavailable(provenance.allocation_terms)],
    ['缴款时点', valueOrUnavailable(provenance.payment_timing)],
    ['公告日期', valueOrUnavailable(provenance.announcement_date)],
    ['公告链接', announcementLink(provenance.announcement_url)],
    [
      '核验时间',
      provenance.verified_at
        ? formatDateTime(provenance.verified_at)
        : UNAVAILABLE
    ]
  ]

  return renderTable(['字段', '内容'], rows)
}

export function buildPlacementExportFilename(candidate, exportedAt) {
  const stockName = sanitizeFilenamePart(candidate?.stockName)
  const stockCode = sanitizeFilenamePart(candidate?.stockCode)
  return `配债详情-${stockName}（${stockCode}）-${formatDate(exportedAt)}.md`
}

export function renderPlacementExportDocument({
  candidate,
  snapshotMeta = {},
  exportedAt
}) {
  const detail = candidate?.detail || {}
  const provenance = candidate?.provenance || {}
  const snapshot = snapshotMeta || {}
  const timelineRows = (detail.stageList || []).map((stage) => [
    valueOrUnavailable(stage.name),
    valueOrUnavailable(stage.date)
  ])

  return [
    `# 配债详情：${valueOrUnavailable(candidate?.stockName)}（${valueOrUnavailable(candidate?.stockCode)}）`,
    '',
    `- 导出时间：${formatDateTime(exportedAt)}`,
    `- 预期上市溢价假设：${valueOrUnavailable(candidate?.placementPremiumRate)}%`,
    `- 数据新鲜度：${freshnessLabel(snapshot)}`,
    `- 数据时间：${snapshot.data_as_of ? formatDateTime(snapshot.data_as_of) : UNAVAILABLE}`,
    `- 核验状态：${verificationLabel(provenance, snapshot)}`,
    `- 需复核：${reviewRequiredLabel(provenance, snapshot)}`,
    '',
    '> 风险提示：配债为规划观察，非确认收益。请自行核实申购资格、股权登记日、配售条款、缴款时点、公告日期与公告链接。',
    '',
    '## 标的与发行信息',
    '',
    renderTable(
      ['字段', '内容'],
      [
        [
          '正股',
          `${valueOrUnavailable(candidate?.stockName)}（${valueOrUnavailable(candidate?.stockCode)}）`
        ],
        [
          '转债',
          `${valueOrUnavailable(candidate?.bondName)}（${valueOrUnavailable(candidate?.bondCode)}）`
        ],
        ['发行进度', valueOrUnavailable(candidate?.progress)],
        ['发行状态', valueOrUnavailable(candidate?._status)],
        ['股权登记日', valueOrUnavailable(candidate?.regDate)],
        ['申购日', valueOrUnavailable(detail.applyDate)],
        ['上市日', valueOrUnavailable(detail.listDate)],
        ['进度更新时间', valueOrUnavailable(detail.progressDt)],
        ['发行规模', valueOrUnavailable(candidate?.issueSize)],
        ['信用评级', valueOrUnavailable(candidate?.rating)],
        ['转股价', valueOrUnavailable(candidate?.conversionPrice)],
        ['股东配售率', valueOrUnavailable(candidate?.shareholderRatio)],
        ['行业标签', valueOrUnavailable(detail.sectorTag)]
      ]
    ),
    '',
    '## 核心指标',
    '',
    renderTable(
      ['字段', '内容'],
      [
        ['正股价', valueOrUnavailable(candidate?.stockPrice)],
        ['正股涨跌', valueOrUnavailable(candidate?.stockChange)],
        ['市净率（PB）', valueOrUnavailable(candidate?.pb)],
        ['正股风险', valueOrUnavailable(candidate?.riskLabel)],
        ['百元含权', valueOrUnavailable(candidate?.cashRatio)],
        ['每股配售', valueOrUnavailable(candidate?.perShare)],
        ['配 10 张需股数', valueOrUnavailable(candidate?.sharesFor10)],
        ['每手配售成本', valueOrUnavailable(candidate?.costPerLot)],
        ['一手党最低成本', valueOrUnavailable(candidate?.oneHandMinCost)],
        ['预估收益', valueOrUnavailable(candidate?.expectedProfit)],
        ['安全垫', valueOrUnavailable(candidate?.safetyPad)],
        ['策略评分', valueOrUnavailable(candidate?.strategyScore)],
        ['策略评级', valueOrUnavailable(candidate?.strategyRating)],
        ['综合排序分', valueOrUnavailable(candidate?._compositeRankRaw)],
        ['首日可交易量', valueOrUnavailable(candidate?.tradableAmount)]
      ]
    ),
    '',
    '## 1 至 5 手成本测算',
    '',
    renderTable(
      ['手数', '每股配售额', '理论股数', '实际所需股数', '最低资金'],
      costRows(candidate || {})
    ),
    '',
    '## 发行时间线',
    '',
    timelineRows.length
      ? renderTable(['阶段', '日期'], timelineRows)
      : UNAVAILABLE,
    '',
    '## 来源证据',
    '',
    renderProvenance(provenance),
    '',
    '## 补充市场信息',
    '',
    renderTable(
      ['字段', '内容'],
      [
        ['20 日均价', valueOrUnavailable(detail.ma20Price)],
        ['相对 20 日均价', valueOrUnavailable(detail.stockTrend)],
        ['登记日基准价', valueOrUnavailable(detail.recordPrice)],
        ['网上发行规模', valueOrUnavailable(detail.onlineIssueSize)],
        ['中签率', valueOrUnavailable(detail.winRate)]
      ]
    ),
    ''
  ].join('\n')
}
