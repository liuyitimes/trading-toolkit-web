# 04 — 日度净值溢价与连续溢价

**What to build:** 用户在列表和详情中看到基于同一交易日收盘价与已公布净值的 LOF Published-NAV Premium、连续正溢价、5/20 日历史和明确的历史不足状态。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Service 持久化有来源和有效性的日度价格/净值配对并派生连续正溢价。
- [ ] Web 区分已确认的 `0 日`、缺失数据和历史不足，盘中参考不计入连续天数。
- [ ] 验证同日配对、净值缺失、过期输入和窗口不足状态。
