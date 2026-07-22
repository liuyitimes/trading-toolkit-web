# 02 - 默认收益假设的配债指标

**Parent:** 01 - Global Placement Yield Assumption

**What to build:** 用户打开配债策略时，可基于统一的默认 30% 预期上市溢价率查看每个候选标的的收益假设、安全垫、评分、评级与排序，而不会把接口预估值当作当前假设结果。

**Blocked by:** None - can start immediately.

**Status:** resolved

- [x] 默认 30% 假设驱动配债列表的预估收益、安全垫、评分、评级和综合排序。
- [x] 无有效获配每手成本时，安全垫明确为不可用且不发生除零。
- [x] 接口源字段保留为可追溯数据，但不控制上述展示指标。
- [x] 使用固定样本验证默认场景、评分和排序结果。

## Answer

The placement list now derives its default metrics from a 30% expected-listing-premium assumption. Fixed-sample browser coverage verifies the derived list values and retained API source values.

## Comments

- 2026-07-22: Verified with `node tests/verify_default_placement_metrics.mjs`, `npm run build`, and OpenSpec validation.
