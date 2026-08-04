## ADDED Requirements

### Requirement: 连续正溢价持续性展示

LOF 页面 MUST（必须）消费配套 Service `persist-lof-premium-streaks` 变更返回的 `premium_persistence` 对象，并按其 `status` 显示持续性。客户端不得将缺失、`partial` 或 `unavailable` 数据回退为真实的 `0 天`。

#### Scenario: 完整连续正溢价

- **当**：LOF 项目的 `premium_persistence.status` 为 `complete` 且天数大于零
- **则**：桌面表格、移动卡片和详情区域必须显示 `N 天`

#### Scenario: 历史不足

- **当**：LOF 项目的 `premium_persistence.status` 为 `partial`
- **则**：页面必须显示“至少 N 天”和“历史不足”
- **并且**：页面必须保留服务端提供的原因供用户查看

#### Scenario: 当前不可比

- **当**：LOF 项目的 `premium_persistence.status` 为 `unavailable`
- **则**：页面必须显示 `--`
- **并且**：不得渲染 `0 天`

### Requirement: 真实零天展示

当前日存在同日可比观测但溢价为零或负数时，Web MUST（必须）将 Service 返回的 `complete` 和零天数显示为 `0 天`，并与不可用状态区分。

#### Scenario: 非正溢价

- **当**：LOF 项目的 `premium_persistence` 返回 `status: complete` 和 `consecutive_positive_sessions: 0`
- **则**：页面必须显示 `0 天`
- **并且**：不得附加“历史不足”或不可用提示
