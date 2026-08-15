## Context

`normalizeLofItem` 当前把 `raw.consecutive_premium` 缺失值回退为零，且 LOF 页面在多个桌面、移动和详情位置直接渲染该数字。配套 Service 变更将用 `premium_persistence` 公开天数与可信度，Web 负责显示而不重算历史。

## Goals / Non-Goals

**Goals:**

- 将 API 持续性对象归一化为明确的展示模型。
- 在所有 LOF 页面位置一致地区分完整、历史不足和不可用状态。
- 保留真实 `0 天` 的可读展示。

**Non-Goals:**

- 在浏览器累计、推断或修复连续正溢价历史。
- 修改套利资格、收益计算或 API 基础地址配置。

## Decisions

- Store 是唯一的 API 归一化位置；视图只消费结构化的展示字段，不直接解析后端嵌套对象。
- `complete` 显示 `N 天`，`partial` 显示“至少 N 天”及“历史不足”，`unavailable` 显示 `--` 和原因。真实的零天仅来自 `complete`。
- 使用现有 Element Plus 表格、标签和响应式卡片样式，不新增页面级卡片或独立缓存。

## Risks / Trade-offs

- [旧服务暂未返回对象] → Store 显式归类为不可用，不再伪造零天。
- [多个页面位置语义漂移] → 通过同一归一化字段和浏览器验证覆盖桌面、移动及详情入口。
- [原因文本过长] → 主界面保留简洁状态，完整原因通过现有 tooltip 或详情文本呈现。
