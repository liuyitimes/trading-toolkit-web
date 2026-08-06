## Context

Web 是 Cloudflare Pages 上的静态 Vue 应用，直接请求 Render 新加坡的 Flask API。大陆访问为尽力而为，不使用 Worker 代理。

## Goals / Non-Goals

**Goals:** 将最小验证纳入 CI，使用 Service 端点矩阵阻止 API 漂移。

**Non-Goals:** 不实现登录、鉴权、复杂视觉回归或 Worker API 代理。

## Decisions

- Cloudflare Pages 凭据只通过 GitHub Secrets 提供。
- Cloudflare Pages 工作流由成功完成的 `CI` 触发，检出 `head_sha` 并串行发布；手动发布仅允许 `main`，避免部署更新但未经 CI 验证的提交。
- API 路径与方法集中为可导入元数据，测试不解析源码。
- Service 矩阵以 GitHub Actions checkout 读取，不建立共享仓库或代码生成。

## Risks / Trade-offs

- [Service 主分支暂不可读] -> Web 契约任务失败，阻止依赖未发布服务的变更。
