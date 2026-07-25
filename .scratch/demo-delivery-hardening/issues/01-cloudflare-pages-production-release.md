# 01 — Cloudflare Pages 生产发布

**What to build:** 将 Web 应用发布到名为 `trading-toolkit-web` 的 Cloudflare Pages 项目，并直接使用配置的 HTTPS API 地址加载核心研究页面。

**Blocked by:** Service repository 02 — Render 服务与数据库配置。

**Status:** ready-for-agent

- [ ] Cloudflare Pages 项目使用锁定依赖和生产构建发布静态文件。
- [ ] API 地址与可选异常上报通过受保护配置提供。
- [ ] 市场与待发配债候选标的流程可在生产地址访问，且没有 CORS 错误。
