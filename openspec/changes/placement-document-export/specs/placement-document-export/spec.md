## ADDED Requirements

### Requirement: 逐候选标的 Markdown 导出

Web MUST 在桌面配债表格和移动端配债卡片中为每个可见 Placement Candidate 提供直接导出控件。激活控件必须为该候选标的下载一份 Markdown 文档，不得提供选择、批量、ZIP、预览或确认流程。

#### Scenario: 桌面用户导出候选标的

- **GIVEN** 桌面配债表格中有一个可见 Placement Candidate
- **WHEN** 用户激活该候选标的导出控件
- **THEN** Web 下载且只下载该候选标的一份 Markdown 文档
- **AND THEN** 行点击不会打开配债详情弹窗。

#### Scenario: 移动端用户导出候选标的

- **GIVEN** 一个 Placement Candidate 以移动端配债卡片显示
- **WHEN** 用户激活该候选标的导出控件
- **THEN** Web 下载且只下载该候选标的一份 Markdown 文档
- **AND THEN** 卡片点击不会打开配债详情弹窗。

#### Scenario: 生成导出文件名

- **GIVEN** 用户导出正股名称和正股代码已知的 Placement Candidate
- **WHEN** Web 创建下载文件
- **THEN** 文件名必须使用 `配债详情-{正股名称}（{正股代码}）-{导出日期}.md`
- **AND THEN** 仅清洗文件系统不允许的字符。

### Requirement: 配债导出文档保真度

Web MUST 从配债视图已加载的候选标的数据，以及用户激活导出时生效的预期上市溢价假设，生成 Placement Export Document。文档必须区分规划观察、已核验事实、需复核的配债来源信息和不可用字段。

#### Scenario: 导出证据完整的候选标的

- **GIVEN** Placement Candidate 包含配债详情、逐候选标的 `placement_provenance` 配债来源信息和快照元数据
- **WHEN** 用户导出该候选标的
- **THEN** 文档必须包含完整配债详情、1 至 5 手成本表、当前溢价假设及派生指标、新鲜度、核验状态、配债来源信息和公告链接
- **AND THEN** 文档必须包含配债是规划观察而非确认收益的固定提示。

#### Scenario: 导出未核验候选标的

- **GIVEN** Placement Candidate 未核验或需要复核配债来源信息
- **WHEN** 用户导出该候选标的
- **THEN** Web 必须允许导出
- **AND THEN** 文档必须陈述其核验或复核状态，且不得表示为已确认可执行机会。

#### Scenario: 导出数据不可用

- **GIVEN** Placement Candidate 缺少必需详情或配债来源信息字段
- **WHEN** 用户导出该候选标的
- **THEN** 文档必须将该字段显示为不可用
- **AND THEN** Web 不得推断或虚构该值。

#### Scenario: 当前溢价假设不同于默认值

- **GIVEN** 用户已选择非默认的预期上市溢价假设
- **WHEN** 用户导出 Placement Candidate
- **THEN** 文档必须陈述该选定假设
- **AND THEN** 文档必须使用相应的预估收益、安全垫、评分、评级和综合排序分。
