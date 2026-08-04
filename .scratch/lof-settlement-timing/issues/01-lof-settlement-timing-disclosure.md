# 01 - LOF 交割时效展示

Type: feature
Status: resolved

## What to build

消费同名 Service 变更提供的逐基金交割时效字段，在 LOF 桌面表格、移动卡片和深链详情中显示申购确认与赎回到账 `T+n`；维护来源、有效日期、核验状态和缺失降级行为。

## External dependency

`trading-toolkit-service/openspec/changes/lof-settlement-timing` 必须提供与 Web 设计中一致的可选 `execution.settlement_timing` 契约。Web 需在字段缺失时显示 `暂缺`，因此前端工作不应被接口发布阻塞。

## Acceptance criteria

- 两侧已核验时，列表、移动卡片和详情展示一致的 `申/赎` 时效。
- 详情可追溯每一侧的来源、有效日期、核验时间和状态。
- 部分缺失、陈旧和旧接口响应均不会生成或推断时效，且不得标为可执行套利。
- 没有任何界面根据交易所显示赎回规则。
- 覆盖桌面和移动浏览器验证，以及完整、部分、陈旧与旧式 API 响应的契约测试。

## Comments

- 2026-08-05: 通过 `grill-with-docs` 完成需求澄清并建立跨仓库规格；尚未开始实现。
- 2026-08-05: Web 已实施并通过完整、陈旧、单侧缺失、无来源和旧式响应的浏览器验证；待同名 Service 变更提供生产字段。
