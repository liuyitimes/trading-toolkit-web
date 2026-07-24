## 背景

配债工作区帮助用户比较原股东配售机会，但详情仅存在于交互式界面中。用户需要一份可持久保存的单个候选标的 Markdown 决策记录，保留当前假设、成本测算、风险提示和来源证据，同时不将观察结果表达为确认收益。

## 变更内容

- 在配债表格和移动端配债卡片中增加逐项 Markdown 导出操作。
- 浏览器仅为被点击的 Placement Candidate 生成一份文档；不增加选择、批量、ZIP、预览或确认流程。
- 文档包含完整配债详情、1 至 5 手成本表、当前预期上市溢价假设及派生指标、固定的规划观察提示、数据新鲜度和核验或复核状态。
- Web 消费的待发配债响应增加逐候选标的发行人证据和公告元数据，由 `trading-toolkit-service` 中同名 `placement-document-export` 变更提供。
- 未核验或需复核的候选标的仍可导出，并在文档中明确呈现缺失或冲突的证据。

## 能力

### 新增能力

- `placement-document-export`：为单个 Placement Candidate 生成并下载 Markdown 决策记录。

### 修改能力

- `convertible-bonds`：消费待发配债响应中的逐候选标的来源信息，同时兼容旧响应。

## 影响

- Web 模块：`src/views/Convertible.vue`、`src/stores/convertible.js` 和专用的客户端 Markdown 导出工具。
- API 消费：`GET /api/v1/convertible/pending` 继续兼容旧数组和 `{ items, meta }` 响应形式，单项可选增加来源字段。
- 跨仓库契约：依赖服务仓库中名为 `placement-document-export` 的配套变更。
- 回滚：移除导出控件和工具即可；旧待发配债响应继续可用，不涉及浏览器存储迁移或服务端文件清理。
