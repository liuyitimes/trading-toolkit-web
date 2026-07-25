# Trading Toolkit Web OpenSpec

`openspec/specs/` 是 Web 应用所负责行为的版本化唯一事实来源。它随 `trading-toolkit-web` Git 仓库保存，确保任意设备上的克隆都包含当前基线和活跃变更。

## 范围

- Vue 路由、视图、状态存储、客户端计算、本地浏览器偏好设置和 API 调用。
- 面向用户的决策支持展示及响应式行为。
- 共享 API 契约中由 Web 侧负责的要求。

独立版本管理的 `trading-toolkit-service` 仓库负责 Flask 路由、数据采集、缓存行为、持久化和服务端计算。跨越这些边界的功能必须在两个仓库使用相同的变更名称；每个变更产物仅描述所属仓库的工作，并显式链接其配套变更。

## 工作流

1. 阅读 `openspec/specs/` 下相关的基线规范。
2. 实现前创建或更新 `openspec/changes/<change-name>/`。
3. 完成提案、增量规格、设计和任务。
4. 验证实现并运行 `openspec validate <change-name> --json`。
5. 在本仓库归档已接受的变更，将其增量合并到此 Web 基线。
