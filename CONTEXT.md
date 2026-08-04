# Trading Toolkit Context

## Glossary

### LOF 交割时效

一只 LOF 从申购提交到份额确认，以及从赎回提交到资金到账所需的基金业务日规则。申购确认和赎回到账分别以 `T+n` 表示；它们必须保留当前有效的基金管理人或发行人来源，未核验时显示为暂缺。

### Placement Candidate

A convertible-bond original-shareholder placement opportunity that remains relevant to a user before its registration date has passed. A candidate carries issuer terms, registration timing, source evidence, and derived decision-support metrics.

### Placement Export Detail

单个 Placement Candidate 可导出的决策记录。它包含候选标的完整配债详情字段、用户发起导出时生效的预期上市溢价假设及派生指标、逐候选标的发行人证据和公告链接、可用时的快照新鲜度与发行条款核验或复核状态、1 至 5 手成本表，以及配债是规划观察而非确认收益的固定提示。

### Placement Export Provenance

Placement Export Document 中的逐候选标的发行人证据：参与资格、登记日、配售条款、缴款时点、公告日期、公告 URL、核验时间和需复核状态。缺失字段必须明确显示为不可用，不得推断。

### Placement Export Document

只包含一个 Placement Candidate 的 Placement Export Detail 的 Markdown 文件。Web 从配债视图已加载的候选标的创建它。用户从该候选标的桌面表格行或移动端卡片直接发起下载，无需确认弹窗；配债视图不提供批量下载。未核验或需复核候选标的仍可导出，文档会明确其状态。

### Placement Export Filename

Placement Export Document 的文件名：`配债详情-{正股名称}（{正股代码}）-{导出日期}.md`。导出清洗只能替换用户文件系统不允许的字符。

### Placement Snapshot

A time-stamped, locally persisted representation of Placement Candidates used for immediate availability. It is not a permanent assertion of current market facts; it records the source and verification time from which the data was last known.

### Placement Observation

A historical version of a Placement Candidate or one of its source fields. Observations preserve changes in issuer terms, dates, and source evidence for audit and later analysis.

### Stale Placement Snapshot

A Placement Snapshot whose refresh target has elapsed or whose last refresh failed. It remains visible while its candidate is still participation-relevant, and must disclose its data time and stale reason rather than being silently removed.

### Placement Field Provenance

The source evidence attached to a group of placement fields. Issuer terms and registration dates require announcement identity, URL, publication time, and verification time; market fields require provider and observation time; derived metrics require a calculation version and input snapshot reference.

### Placement Refresh Job

An asynchronous task that obtains external placement data and reconciles it into Placement Snapshots and Observations. User-facing reads never wait for this job; a forced refresh requests or observes the job rather than performing provider I/O in the HTTP request.

### Placement Refresh Policy

The scheduling policy for Placement Refresh Jobs: run at service start, every 15 minutes on trading days from 08:30 to 18:00, every two hours otherwise, and every five minutes for candidates registering today or tomorrow. Only one equivalent refresh may run at a time; failures retry with exponential backoff.

### Placement Retention Policy

Placement Snapshots remain available through 30 days after registration. Placement Observations and announcement metadata remain available for three years. Daily cleanup soft-deletes obsolete current snapshots without removing their audit history.

### Placement Source Priority

The conflict rule for Placement Field Provenance: official exchange or CNINFO announcements outrank issuer announcement pages, which outrank Eastmoney issuance lists, which outrank other market data or inferred values. Equal-priority conflicts require review; an auditable manual confirmation may override automated sources.

### Placement Freshness State

The user-visible state of a Placement Snapshot. Fresh data shows its update time; a stale snapshot shows its last successful time and reason; verified issuer terms identify announcement verification; equal-priority conflicts are shown as requiring review. Imminent candidates remain visible regardless of market-field freshness.
