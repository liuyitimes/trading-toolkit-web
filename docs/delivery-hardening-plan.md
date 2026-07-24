# Demo 交付加固计划

状态：已实施；外部平台配置与生产验收待完成。本文记录 Vue Web 应用在 Demo 阶段的交付约束、最小质量门禁和实施顺序。

## 已确认的范围

- 不实现用户登录、用户鉴权或会话体系。
- Web 使用 Cloudflare Pages；通过 `VITE_API_BASE_URL` 直接调用 Render 新加坡的 Flask 服务，不引入 Worker API 代理。
- 中国大陆访问为尽力而为，不办理 ICP，不承诺大陆节点、低延迟或 SLA。
- `main` 受保护，合并后自动部署。

区域与大陆访问限制见 Service 仓库的 `docs/research/china-mainland-hosting-options.md`。

## 实施顺序

### 1. Cloudflare Pages 发布

- 新建 Cloudflare Pages 部署工作流，使用锁定依赖的 `npm ci` 和 `npm run build`。
- 将 `VITE_API_BASE_URL` 配置为 Cloudflare Pages 的受保护环境变量；开发和预览环境使用各自的服务地址。
- 迁移前保留 GitHub Pages，待 Cloudflare 生产构建、环境变量和冒烟访问验证完成后停用旧发布路径。

验证：预览与生产构建均通过；生产站点只请求配置的 API 基础地址；首屏和核心路由可加载。

### 2. 最小 CI 门禁

- 为 `package.json` 提供统一 `test` 或 `verify` 命令。
- PR 必须通过交付边界的 Prettier 检查、生产构建以及三个浏览器用例：市场页加载、待发配债候选标的列表加载、配债详情导出。全仓格式化是单独治理项，不阻断现有 Demo 交付。
- 调试、视觉比对和扩展浏览器脚本保留为按需运行，不阻塞日常合并。

验证：任一最小用例失败时 PR 不能合并；非关键脚本不影响日常发布速度。

### 3. 服务端契约消费

- CI 从 Service 仓库读取机器可读的端点矩阵，校验 `src/api/` 的路径和方法。
- 将 API 模块的端点定义集中到可测试的导出，避免依赖正则扫描源码。
- 修复或移除 `userApi.toggleFavorite`，不再调用未实现路由。
- 对跨仓库变化按“服务先兼容新增、Web 后切换、旧能力最后删除”执行。

验证：未知路径或方法使 Web CI 失败；服务端尚未发布的新能力不能作为 Web 的生产依赖。

### 4. 浏览器边界与异常追踪

- 仅从已配置的 API 基础地址发请求，不在页面中硬编码域名。
- 接入 Sentry 免费层的前端异常上报；不记录用户输入、完整 HTTP 正文或令牌。
- 与 Service 的 CORS 允许来源同步维护 Cloudflare Pages 正式域名及本地开发地址。

验证：生产构建异常能被捕获；不允许的来源无法跨域调用服务；错误上报不包含敏感内容。

### 5. 依赖与分支治理

- 开启 Dependabot 每周创建依赖升级 PR 和 CodeQL 的 `main` / PR 扫描，不自动合并。
- GitHub 中为 `main` 配置必需检查和 PR 审查。

验证：依赖或代码扫描结果可见；未通过必需检查的变更无法合并。

## 非目标

- 不建设用户登录、鉴权、RBAC 或 Worker API 代理。
- 不承诺中国大陆网络性能。
- 不把视觉回归全集、复杂端到端矩阵或性能压测作为每个 PR 的阻塞条件。
