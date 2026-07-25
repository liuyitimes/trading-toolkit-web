# 02 — Web GitHub 发布治理

**What to build:** 让 Web 主分支在契约、构建与浏览器验证通过后发布到 Cloudflare Pages，并保护发布凭据与主分支治理规则。

**Blocked by:** 01 — Cloudflare Pages 生产发布。

**Status:** ready-for-agent

- [ ] Cloudflare 发布凭据与 API 基础地址作为 GitHub Secrets 配置。
- [ ] 主分支要求 Web CI、浏览器验证与代码扫描通过，并要求拉取请求审查。
- [ ] 主分支发布不会绕过 Web API 契约验证。
