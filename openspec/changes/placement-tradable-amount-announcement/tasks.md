# 任务

- [x] 1. 修正待配债归一化，保留 `null` 配售字段并更新公式提示。
  - 依赖：服务端同名变更提供 `null` 和状态字段。
  - 验证：浏览器回归检查列表、详情和公式提示的缺失展示。
- [x] 2. 增加客户端契约/归一化回归测试，覆盖公告值和公告缺失两种状态。
  - 依赖：任务 1。
  - 验证：执行 `node tests/verify_default_placement_metrics.mjs`。
- [x] 3. 更新上下文与配套文档，验证构建和 OpenSpec。
  - 依赖：任务 1 和 2。
  - 验证：执行 `npm run build` 和 `openspec validate placement-tradable-amount-announcement --json`。
