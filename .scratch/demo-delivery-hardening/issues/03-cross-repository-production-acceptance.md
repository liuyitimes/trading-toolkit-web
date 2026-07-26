# 03 — 跨仓库生产验收

**What to build:** 从 Cloudflare Pages 到 Render 服务完成一次可观察的端到端 Demo 验收，确认契约、跨域、健康检查和核心页面共同工作。

**Blocked by:** 02 — Web GitHub 发布治理； Service repository 03 — 服务端 GitHub 发布治理。

**Status:** ready-for-agent

- [ ] Web 生产站点只调用配置的服务地址，并获得允许的跨域响应。
- [ ] 服务健康检查、市场首页与配债工作流均可用。
- [ ] 验收记录明确大陆访问为尽力而为，不宣称大陆节点或 SLA。
