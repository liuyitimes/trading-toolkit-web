# 03 - 可调整且持久化的收益假设

**Parent:** 01 - Global Placement Yield Assumption

**What to build:** 用户可以在配债策略中选择 30% 到 100% 的预期上市溢价率，刷新后保持选择，并在切换或恢复默认时立即看到列表、评级和排序采用同一假设更新。

**Blocked by:** 02 - 默认收益假设的配债指标

**Status:** resolved

- [x] 控件仅提供 30% 至 100%、10% 递进的有效选项，并支持恢复至 30%。
- [x] 缺失、损坏或越界的本地偏好回退为 30%，不会进入计算或控件。
- [x] 切换假设无需重新请求接口，所有配债候选项的计算与排序同步更新。
- [x] 验证 30%/100% 边界、持久化、非法缓存和恢复默认。

## Answer

The convertible store owns the persisted placement premium preference and exposes only the approved 30% to 100% options. The placement toolbar updates the derived list without refetching data.

## Comments

- 2026-07-22: Browser verification covers the approved option set, 30%/100% boundaries, persistence, invalid cache fallback, reset, and no-refetch behavior.
