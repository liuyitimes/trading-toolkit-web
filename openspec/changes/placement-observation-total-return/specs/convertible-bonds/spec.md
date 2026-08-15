## MODIFIED Requirements

### Requirement: 配债观察列表排序和过期标记

Web MUST 显示服务端返回的所有符合观察范围的未上市配债项，包括登记日已过的标的。Store MUST 按 `eligible`、`registration_unknown`、`expired` 分组排序：可观察项按登记日升序，未知项居中，过期项按登记日降序。相同排序键 MUST 保留来源顺序。

#### Scenario: 登记日已过的候选项

- **GIVEN** 服务返回登记日早于当前日期且债券尚未上市的候选项
- **WHEN** 页面渲染配债列表
- **THEN** 候选项仍可见
- **AND THEN** 列表和详情显示“已过期”

#### Scenario: 临近登记日排序

- **GIVEN** 服务返回未来、未知和已过登记日的多个候选项
- **WHEN** Store 派生 `pendingList`
- **THEN** 未来或当天登记项按日期升序排列
- **AND THEN** 未知日期排在其后，过期项按日期降序排在最后
