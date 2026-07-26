# 设计

## API 调用

Web 概览消费来自配套 Service 变更的已验证摘要字段。Service 负责数据源选择和聚合；客户端仅使用其文档化的计算语义来标注结果估算值和限制条件。

```text
net_subscription_capital = max(net_share_change, 0) * NAV
account_count_lower_bound = ceil(net_subscription_capital / verified_per_account_limit)
investor_limit_lower_bound = ceil(net_subscription_capital / verified_per_investor_limit)
```

实现必须保留份额单位、份额日期、NAV 日期、来源 URL、获取时间、限额值、限额主体（`account` 或 `investor`）、适用渠道、适用份额类别，以及已排除非申购变动的记录。正向净份额变动是申购活动的下限近似值，而非总申购量。聚合仅允许在单位兼容且最新已完成交易日相同的记录之间进行。跨多只基金或多个日期时，它变为 `累计等效参与次数`；绝不能以去重后的账户数、投资者数或人数形式展示。

## 展示

`hot_direction` 是完整证据组，包含 `status`、`reason`、方向名称、计算方法、加权溢价、样本量、分类基金构成、未分类覆盖、`as_of`、`source` 和 `retrieved_at`。Web 仅在整组证据完整可用时渲染命名方向，并提供构成基金查看入口；否则显示 `暂缺`、原因和覆盖范围。

Web 概览保留四张决策卡片：

- `溢价热点方向`：最高加权正溢价分类方向。
- `昨日净申购资金（估）`：汇总资金，附带来源日期。
- `昨日净申购账户数下限`：汇总下限，仅限已验证单账户限额的基金。
- `昨日净申购投资者限额下限`：单独的下限，仅在有明确单投资者限额时展示；它不是独立人数。

当每日数据源缺失时，字段使用 `暂缺` 搭配简短的可用性状态展示。它们绝不使用现有的 `lof_arbitrage` 模拟历史兜底数据。

## 外部依赖

配套 Service 变更必须为每日 LOF 净份额变动选择已验证的数据源，并暴露相应的可用性元数据。Web 客户端仅在该契约报告已验证数据时才渲染估算值。
