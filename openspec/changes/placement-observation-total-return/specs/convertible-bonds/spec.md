## ADDED Requirements

### Requirement: 配债观察列表排序

Web MUST（必须）保留服务端返回的配债观察标的，按当前可参与、登记日未知、已过期三组展示，并将已过期标的明确标记为不可参与。

#### Scenario: 已过期观察标的

- **GIVEN** 服务返回 `placement_observation_state: "expired"`
- **WHEN** 用户打开配债列表
- **THEN** Web 显示该标的及“已过期”状态
- **AND** 它排在当前可参与和登记日未知标的之后
