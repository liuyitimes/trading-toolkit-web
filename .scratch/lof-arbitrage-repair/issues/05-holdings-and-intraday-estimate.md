# 05 — 持仓披露与盘中持仓推算溢价

**What to build:** 用户在列表中看到 LOF Portfolio Holdings 摘要，在详情中看到完整披露持仓；满足覆盖率和新鲜度门槛时，额外看到明确标注的 LOF Holdings-Implied Premium。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Service 返回持仓、集中度、披露日期、来源和可用性，并区分其与用户持仓及基金份额变化。
- [ ] 仅当实时可定价资产覆盖率至少 90%、披露不超过一个交易日时返回盘中估算。
- [ ] Web 在列表显示摘要、详情显示披露，并为低覆盖或过期数据显示不可用状态。
