# 04 - 配债详情与移动端假设一致性

**Parent:** 01 - Global Placement Yield Assumption

**What to build:** 用户在详情、公式提示和移动端卡片中看到与桌面列表完全相同的当前收益假设及派生数值；切换假设时，已打开详情仍显示同一候选标的的新结果。

**Blocked by:** 03 - 可调整且持久化的收益假设

**Status:** resolved

- [x] 工具提示、详情核心指标和移动端卡片标明当前预期上市溢价率。
- [x] 已打开的详情在切换假设后更新收益假设、安全垫、评分和评级，不保留旧副本。
- [x] 移动端控制区换行后仍保持筛选、排序和假设控件可用且不重叠。
- [x] 验证桌面列表、详情、提示和移动端卡片的数值一致性。

## Answer

Placement detail state now stores a stable candidate key and resolves the current derived item reactively. Desktop tooltips, detail metrics, and mobile cards disclose the active assumption and use the same derived metrics.

## Comments

- 2026-07-22: Browser verification confirms an already-open detail and a 390px mobile card update from the 30% default to the 100% scenario.
