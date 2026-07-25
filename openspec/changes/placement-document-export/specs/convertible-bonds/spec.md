## ADDED Requirements

### Requirement: 待发配债来源信息消费

Web MUST 接受 `GET /api/v1/convertible/pending` 每项中可选的 `placement_provenance`（配债来源信息），并继续支持既有数组和 `{ items, meta }` 响应形式。服务端提供时，该对象必须保留参与资格、登记日、配售条款、缴款时点、公告日期、公告 URL、核验时间和需复核状态；Web 不得读取 `placement_evidence` 或裸 `provenance` 作为替代。

#### Scenario: 返回增强待发配债响应

- **GIVEN** 服务端返回包含 `placement_provenance` 配债来源信息的待发配债项
- **WHEN** Web 规范化待发配债响应
- **THEN** 配债来源信息必须继续关联到相应 Placement Candidate
- **AND THEN** 其公告 URL 和核验状态必须可用于配债展示和导出行为。

#### Scenario: 返回旧待发配债响应

- **GIVEN** 服务端返回不带 `placement_provenance` 的既有数组响应
- **WHEN** Web 规范化待发配债响应
- **THEN** 配债列表仍必须可用
- **AND THEN** 所有依赖配债来源信息的展示或导出字段必须标记为不可用，不得推断。
