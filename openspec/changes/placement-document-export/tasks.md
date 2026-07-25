## 1. 契约准备

- [x] 1.1 统一跨端术语和字段：待发配债候选标的来源信息只使用 `placement_provenance`；服务仓库已创建同名配套 OpenSpec 变更。验证：两仓库的 OpenSpec 校验。
- [x] 1.2 扩展待发项规范化以保留可选的 `placement_provenance` 配债来源信息，同时保持旧数组和 `{ items, meta }` 响应兼容；不接受历史别名。验证：浏览器用例覆盖增强和旧式响应。

## 2. Markdown 生成

- [x] 2.1 实现专用客户端工具，从规范化候选标的、当前溢价假设、快照元数据和现有 1 至 5 手计算生成一份 Placement Export Document。验证：`node tests\placement-export.mjs`。
- [x] 2.2 实现符合约定文件名且只清洗非法字符的单文件直接下载。验证：浏览器下载断言。
- [x] 2.3 渲染固定规划观察提示、新鲜度、核验、需复核、配债来源信息和不可用状态，不进行推断。验证：聚焦文档与旧响应浏览器用例。

## 3. 配债控件

- [x] 3.1 在桌面配债表格中增加可访问的逐行导出图标控件，且不触发详情弹窗。验证：桌面 Playwright 下载断言。
- [x] 3.2 在每张移动端配债卡片增加等价的直接导出控件，且不触发详情弹窗。验证：移动 Playwright 下载断言。

## 4. 验证

- [x] 4.1 增加 Markdown 内容、文件名、当前假设、不可用配债来源信息以及未核验或需复核候选标的的聚焦自动化覆盖。验证：`node tests\placement-export.mjs`。
- [x] 4.2 在桌面和移动浏览器视口验证导出控件和下载，覆盖旧待发响应和增强来源响应。验证：`node tests\verify_placement_export.mjs`。
- [ ] 4.3 执行 `npm run build`、`npm run format:check` 和 `openspec validate placement-document-export --json`。前两项已执行；构建和 OpenSpec 校验通过，仓库既有 63 个文件未通过全局 Prettier 检查，待基线修复后重新执行。
