## ADDED Requirements

### Requirement: LOF 场内规则契约兼容

Web 应用 MUST 兼容服务端缺少 `execution.minimum_order` 或 `execution.settlement_timing` 的旧响应，并将缺失场内规则渲染为 `--`，不得以默认值或交易所规则替代。

#### Scenario: 服务端尚未提供新字段

- **GIVEN** LOF 列表响应省略场内规则对象
- **WHEN** 用户打开 LOF 页面
- **THEN** 页面继续渲染行情和溢价数据
- **AND** 时效与最低申/赎均显示 `--`
