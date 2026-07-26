## Why

Web 需要从 GitHub Pages 迁移到 Cloudflare Pages，并将已有构建与浏览器验证变成合并门禁，同时防止 API 包装与 Flask 路由漂移。

## What Changes

- 增加 Cloudflare Pages 发布工作流和最小 CI 验证。
- Cloudflare Pages 仅在 `main` 的 CI 成功后发布该次已验证的提交。
- 集中 API 端点定义，并针对 Service 端点矩阵做校验。
- 移除未实现的收藏切换路由调用。

## Capabilities

### New Capabilities

- `demo-web-delivery`: Demo Web 的交付门禁和服务契约消费。

### Modified Capabilities

- `web-application`: 修改部署与 API 消费验证要求。

## Impact

影响 `src/api/`、测试、GitHub Actions 与 Cloudflare 环境变量。配套 Service 变更同名为 `demo-delivery-hardening`。
