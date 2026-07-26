## ADDED Requirements

### Requirement: Web 端点矩阵校验

Web MUST 只调用 Service 端点矩阵中声明的路径和方法。

#### Scenario: 未声明的 Web 请求

- **WHEN** Web API 定义包含端点矩阵未声明的路径或方法
- **THEN** Web 契约验证失败。

### Requirement: 最小发布门禁

Web MUST 在合并到受保护主分支前通过格式检查、生产构建和关键工作流验证。

#### Scenario: 构建失败

- **WHEN** 生产构建或关键验证失败
- **THEN** 发布工作流不得部署该提交。

#### Scenario: 主分支验证成功

- **WHEN** `main` 上的 CI 成功完成
- **THEN** Cloudflare Pages 工作流检出并发布该次 CI 的 `head_sha`
- **AND THEN** 不发布 CI 期间进入 `main` 的更新提交。
