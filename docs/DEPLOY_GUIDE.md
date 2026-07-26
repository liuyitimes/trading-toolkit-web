# Web 交付指南（Cloudflare Pages）

本项目 Demo 阶段以 Cloudflare Pages 托管 Vue 应用，并直接请求 Render 新加坡的 Flask API。中国大陆访问属于尽力而为，不承诺大陆节点、低延迟或 SLA；原因见 Service 仓库的 `docs/research/china-mainland-hosting-options.md`。

## 一次性配置

1. 在 Cloudflare Pages 创建项目 `trading-toolkit-web`，连接 GitHub 仓库。
2. 在 GitHub Actions Secrets 设置：

| Secret                  | 用途                                  |
| ----------------------- | ------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | 具有 Pages 编辑权限的最小权限 Token。 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID。                  |
| `VITE_API_BASE_URL`     | Render 服务的 HTTPS 根地址。          |
| `VITE_SENTRY_DSN`       | 可选；留空则不加载 Sentry。           |

3. 在 Render 的 `CORS_ALLOWED_ORIGINS` 中加入 Cloudflare Pages 正式域名。
4. 在 GitHub 为 `main` 启用 PR 审查及 CI、CodeQL 等必需检查。

`.github/workflows/cloudflare-pages.yml` 会在 `main` 合并后执行锁定依赖安装、格式检查和生产构建，再发布 `dist/`。GitHub Pages 工作流暂时保留为回退通道，确认 Cloudflare 的生产构建、环境变量和核心页面访问都通过后再停用。

## 本地验证

```bash
npm ci
npm run format:check
npm run verify:contract
npm run verify:placement-export
npm run build
```

浏览器验证需要先启动 Vite：

```bash
npm run dev -- --host 127.0.0.1 --port 5175
npm run verify:market-browser
npm run verify:placement-browser
```

## 发布后检查

1. 打开 Cloudflare Pages 正式地址，确认市场首页与配债页面可加载。
2. 用浏览器网络面板确认请求只发往配置的 `VITE_API_BASE_URL`。
3. 确认 API 响应没有 CORS 报错；若有，核对 Render 的 `CORS_ALLOWED_ORIGINS`。
4. 若配置 Sentry，制造一次受控前端异常并确认事件不包含用户输入、完整请求正文或令牌。
