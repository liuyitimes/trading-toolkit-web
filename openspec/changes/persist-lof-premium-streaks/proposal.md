## Why

LOF 页面将后端缺失的连续溢价字段静默回退为 `0 天`，使用户无法判断该数值是否真实。配套 Service 变更将提供带可信度与原因的持续性对象，Web 必须按其语义展示。

## What Changes

- 修改 LOF API 归一化逻辑，消费 `premium_persistence` 而不是将缺失数值回退为零。
- 修改桌面表格、移动卡片和详情区域的连续溢价展示，明确显示完整、历史不足和不可用状态。
- 保留 `consecutivePremium` 作为视图派生数值，但不用于吞没状态或替代 API 事实。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `lof-funds`：LOF 页面展示配套 Service `persist-lof-premium-streaks` 变更提供的连续正溢价持续性契约。

## Impact

- 影响 `src/stores/lof.js`、`src/views/Lof.vue` 和 LOF 页面验证脚本。
- 依赖 Service 同名变更的 `/api/v1/lof/list` `premium_persistence` 对象。
- 回滚时恢复既有列显示，但不得再次把 API 不可用状态描述为真实零天数。
