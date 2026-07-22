# Design

## API consumption

The Web overview consumes verified summary fields from the companion Service change. The Service owns source selection and aggregation; the client uses its documented calculation semantics only to label the resulting estimates and limitations.

```text
net_subscription_capital = max(net_share_change, 0) * NAV
account_count_lower_bound = ceil(net_subscription_capital / verified_per_account_limit)
investor_limit_lower_bound = ceil(net_subscription_capital / verified_per_investor_limit)
```

The implementation must retain share unit, share date, NAV date, source URL, retrieval time, limit value, limit subject (`account` or `investor`), applicable channels, applicable share class, and a record that non-subscription changes have been excluded. A positive net-share change is a lower-bound proxy for subscription activity, not gross subscriptions. Aggregation is permitted only across records with compatible units and the same latest completed trading date. Across multiple funds or dates it becomes `累计等效参与次数`; it must never be presented as deduplicated accounts, investors, or people.

## Presentation

The Web overview will replace generic counts with three cards:

- `溢价热点方向`: highest weighted positive-premium taxonomy direction.
- `昨日净申购资金（估）`: aggregate capital, with source date.
- `昨日净申购账户数下限`: aggregate lower bound limited to funds with verified per-account caps.
- `昨日净申购投资者限额下限`: separate lower bound, displayed only for explicit per-investor caps; it is not a unique-person count.

Fields use `暂缺` together with a short availability state when the daily source is missing. They never use the existing `lof_arbitrage` mock-history fallback.

## External dependency

The companion Service change must select a verified source for daily LOF net-share changes and expose the resulting availability metadata. The Web client renders the estimate only when that contract reports verified data.
