# 变更记录 (CHANGELOG)

> 本文件记录每次需求改动的内容、涉及文件及完成状态。

---

## 2026-07-09

### LOF 数据源切换：新浪 → 东方财富，补全净值/溢价率/连续溢价/申购状态

> 需求：LOF 页面数据大幅缺失，根因是后端使用新浪 API 不提供基金净值和溢价率。切换到东方财富 push2 API（与小程序端对齐），补全全部缺失字段。

**改动文件**

| 文件 | 改动 |
|------|------|
| `trading-toolkit-service/cloudrun/services/lof_fund.py` | 数据源从新浪 JSONP 切换到东方财富 push2 API（`b:MK0404` LOF + `b:MK0403` ETF）；字段映射 f161→净值、f168→溢价率；新增连续溢价快照机制（JSON 文件，保留 30 天）；新增申购状态获取（东财基金详情 API，1h 缓存）；套利机会改用真实溢价率排序；市场概览补充溢价率统计（positive_count/discount_count/top_premium/top_premium_board 等） |

**补全字段对照**

| 字段 | 改动前（新浪） | 改动后（东财） |
|------|---------------|---------------|
| 估值（净值） | 硬编码 0 | f161 实时净值 |
| 溢价率 | 硬编码 0 | f168 实时溢价率 |
| 连续溢价 | 硬编码 0 | 本地快照计算 |
| 申购状态 | 硬编码 '不限' | 东财详情 API |
| 套利机会排序 | 按涨跌幅冒充 | 按真实溢价率 |

---

### 成本弹窗新增一手党多档位成功率参考

> 需求：在成本弹窗中新增"一手党成功率参考"区域，展示 50%/60%/70%/80%/100% 五个档位对应的理论股数、实际所需股数和成本，60% 档位标记为推荐。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 新增 `oneHandTierData` computed 属性（5 档位计算）；成本弹窗 1-5 手表格下方插入档位表格（仅沪市显示）；新增 `.tier-section` 相关样式 |

### 成本弹窗"计算公式说明"优化

> 需求：计算公式说明区域内容重叠、逻辑不清晰，优化为分步展示。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 计算公式说明改为三步分组（① 配售额度 ② 股数计算 ③ 资金计算），A股取整约束内嵌到步骤标题；新增 `.ft-step` 样式 |

### 安全垫计算改用实际股数

> 需求：安全垫计算应使用实际需买入的整数手股数（向上取整到100股整数倍），而非理论 sharesFor10，贴近真实成交成本。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/stores/convertible.js` | `computeSafetyPad` 调用改用 `_actualSharesFor1Lot` 代替 `sharesFor10`；调整代码顺序，将实际股数计算提前到安全垫之前；`_costFor10LotsRaw` 改为引用 `_costPerLotRaw` |
| `src/views/Convertible.vue` | 安全垫 tooltip 公式展示改用 `_actualSharesFor1Lot` 显示实际股数 |

---

### 创建项目上下文交接文档

> 需求：创建项目上下文交接文档，记录本次会话所有工作内容、技术决策、关键文件路径，便于新会话快速接手。

**改动文件**

| 文件 | 改动 |
|------|------|
| `docs/project_context_handoff.md` | 新建项目上下文交接文档，包含项目概述、已完成任务、未完成任务、技术决策、核心计算逻辑等 |

---

### 更新沪市一手党规则：理论最低50%，实操建议60%

> 需求：沪市可转债配售使用精确算法，不足1手的部分四舍五入。理论最低只需持有50%股数，60%为实操建议值。同时修正规格文档中 sharesPerLotRaw 的错误公式。

**改动文件**

| 文件 | 改动 |
|------|------|
| `docs/specs/convertible-placement-cost-spec.md` | 更新一手党规则说明（50%理论值+60%实操值）；修正 `sharesPerLotRaw` 公式为 `sharesFor10`（1手=10张） |
| `trading-toolkit-service/docs/DATA_GUIDE.md` | 更新 `sharesPerLotRaw` 和 `oneHandMinShares` 说明 |
| `trading-toolkit-mp/DATA_GUIDE.md` | 更新一手党计算说明 |
| `src/views/Convertible.vue` | 成本弹窗“沪市一手党说明”更新为精确算法描述，区分50%理论值和60%实操值 |
| `src/stores/convertible.js` | 更新一手党注释，说明50%理论值和60%实操建议值（计算逻辑保持0.6不变） |

### 修正沪市一手党计算规则：改为 60% 股数

> 需求：沪市一手党规则是只需持有配10张需股数的 60% 即可获配 1 手，之前错误地改为 100% 股数，现修正。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/stores/convertible.js` | `_oneHandMinShares` 计算改为 `Math.ceil(sharesFor10 * 0.6 / 100) * 100`（60% + 100股取整） |
| `src/views/Convertible.vue` | 成本列恢复第3行“一手党最低≈”显示；配售详情弹窗恢复“一手党最低”字段；成本弹窗“沪深配售规则”说明改为 60% 规则 |

---

### 成本说明弹窗补充沪市一手党说明

> 需求：在成本弹窗"沪深配售规则"折叠面板中补充沪市一手党计算说明，帮助投资者理解一手党配售所需股数。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 在"沪深配售规则"折叠面板中追加"沪市一手党说明"区块：说明一手党定义、需持有正股数计算规则（向上取整到100股整数倍），并指引用户参考表格第1行数据 |

---

### 可转债配售表成本列排版优化

> 需求：消除成本列重复信息（“获配每手”与“一手党最低”值相同），精简为2行显示。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 成本列单元格从4行精简为2行：第1行显示“每股 XXX元”，第2行显示“XXX元（需买入XXX股）”；删除“一手党最低”行；配售详情弹窗中同步删除“一手党最低”条目；新增 `.cost-value` 和 `.cost-shares` 样式 |

### 成本说明弹窗重新设计（1-5手表格+可折叠公式）

> 需求：将成本弹窗从纯文本公式展示改为表格+可折叠公式两部分。上方用 el-table 展示1-5手配售参数，下方用 el-collapse 展示计算公式和沪深规则。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 替换成本弹窗模板（原行534-606）：新增 `costTableData` computed 计算1-5手参数；弹窗改为 el-table 展示配售参数 + el-collapse 可折叠公式说明；弹窗宽度从520px调整为560px |

---

### 策略沙盘默认隐藏 + 设置开关控制

> 需求：策略沙盘默认隐藏，用户可在设置页面通过开关控制显示/隐藏。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/stores/app.js` | 添加 `showSandbox` 状态（默认 false）、`initShowSandbox`、`toggleShowSandbox` 方法，localStorage 持久化 |
| `src/views/Settings.vue` | 在「外观」卡片中添加「显示策略沙盘」开关（el-switch） |
| `src/views/Convertible.vue` | 沙盘 el-card 添加 `v-if="appStore.showSandbox"`，导入 useAppStore |
| `src/views/Lof.vue` | 同上 |
| `src/views/Hkipo.vue` | 同上 |

---

### 修正一手党最低成本计算

> 需求：一手党计算从经验系数 `Math.ceil(sharesFor10 * 0.6)` 改为按100股整数取整（A股最小交易单位）。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/stores/convertible.js` | `_oneHandMinShares` 计算改为使用 `_actualSharesFor1Lot`（向上取整到100股整数倍），并调整代码顺序确保变量先定义后使用 |

---

## 2026-07-08

### LOF 详情弹窗重构（对标可转债弹窗模式）

> 需求：标的详情要改成跟可转债一样的弹窗形式。显示关键基础数据，中间计算值要下划线并鼠标悬浮展示计算公式以及数值算过程。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Lof.vue` | 详情弹窗模板重构为 `el-tooltip` + `formula-tip` 模式 |
| `src/views/Lof.vue` | `detailNetPremium` 修正：从只扣 0.15% 改为扣 0.15% + 0.05%（与表头公式一致）|
| `src/views/Lof.vue` | 新增 `detailOneBaseLabel` 计算属性（申购基数标签）|
| `src/views/Lof.vue` | 新增 `.hover-value` 样式（虚线下划线 + hover 变色）|
| `src/views/Lof.vue` | 新增 non-scoped `<style>` 块：`.formula-tip` / `.dialog-header-fund` 样式 |
| `src/views/Lof.vue` | `.detail-value` 新增 `&.up` / `&.down` 颜色类 |

**弹窗结构**

| 区域 | 展示内容 | 交互 |
|------|----------|------|
| 基础信息 | 交易所、涨跌幅、申购限额、赎回规则 | 普通展示 |
| 价格与溢价 | 当前价、基金净值、溢价率、净溢价 | 中间计算值有虚线下划线 + 悬浮公式 |
| 流动性数据 | 成交额、成交量、连续溢价 | 普通展示 |
| 收益计算 | 预期收益、一拖六收益(限购时) | 中间计算值有虚线下划线 + 悬浮公式 |
| 操作建议 | 分段文案 | 普通展示 |

**悬浮公式 tooltip（4 个计算值）**

- **溢价率**：`(场内价格 - 基金净值) / 基金净值 × 100%` → 实际数值代入计算
- **净溢价**：`溢价率 - 申购费率(0.15%) - 卖出佣金率(0.05%)` → 实际数值代入计算
- **预期收益**：`申购金额 × 净溢价 / 100` → 实际数值代入计算
- **一拖六收益**：`6账户 × 100元 × 净溢价 / 100` → 实际数值代入计算

---

### 市场概览精简为 4 项

> 需求：市场概览仅显示溢价最多的板块，板块平均溢价，全部溢价基金的总溢价数，全部折价基金的折价数。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/stores/lof.js` | `computeSummaryFromList` 新增按交易所分组统计，输出 `top_premium_board` 和 `top_board_premium_avg` |
| `src/stores/lof.js` | 后端 summary 合并逻辑同步补充这两个字段的兜底 |
| `src/views/Lof.vue` | 概览网格从 12 项精简为 4 项 |
| `src/views/Lof.vue` | 网格列数从 `repeat(6, 1fr)` 改为 `repeat(4, 1fr)` |
| `src/views/Lof.vue` | 中屏响应式从 `repeat(3, 1fr)` 改为 `repeat(2, 1fr)` |

**概览 4 项**

| 指标 | 数据来源 | 示例 |
|------|----------|------|
| 溢价最多板块 | 按交易所(沪/深/京)分组，取平均溢价最高的板块 | 沪市 |
| 板块平均溢价 | 该板块的平均溢价率 | 3.25% |
| 溢价基金数 | 全部溢价(>0)基金总数 | 45 |
| 折价基金数 | 全部折价(<0)基金总数 | 12 |

---

### 小程序项目目录清理与整理

> 需求：清理整理 trading-toolkit-mp 项目目录，修正文件名、归档文档、补充项目说明。

**改动内容**

| 操作 | 文件 | 说明 |
|------|------|------|
| 重命名 | `微信审核资料.md.md` → `微信审核资料.md` | 修正双后缀文件名 |
| 归档 | `DATA_GUIDE.md` → `docs/DATA_GUIDE.md` | 移入 docs 目录 |
| 归档 | `微信审核改造计划.md` → `docs/微信审核改造计划.md` | 移入 docs 目录 |
| 归档 | `微信审核资料.md` → `docs/微信审核资料.md` | 移入 docs 目录 |
| 新建 | `README.md` | 补充小程序项目说明（技术栈、目录结构、开发指南） |
| 新建 | `resources/README.md` | 补充静态资源图片说明 |

---

## 2026-07-09

### 可转债配售表成本列点击弹窗

> 需求：将成本列从 el-tooltip 悬停展示改为点击弹出 el-dialog 弹窗，展示公式说明和当前债券具体计算过程，强调A股最小单位为1手（100股整数），并显示正股价。

**改动文件**

| 文件 | 改动 |
|------|------|
| `src/views/Convertible.vue` | 新增 `costDialogVisible`、`costDialogRow` 响应式变量 |
| `src/views/Convertible.vue` | 新增 `openCostDialog(row)` 方法 |
| `src/views/Convertible.vue` | 成本列单元格：移除 el-tooltip 包裹，改为 `.cost-cell` + `@click.stop="openCostDialog(row)"` |
| `src/views/Convertible.vue` | 新增 el-dialog 成本说明弹窗：含公式说明、当前债券计算过程（含正股价）、沪深规则、一手党 |
| `src/views/Convertible.vue` | 新增 `.cost-cell` cursor-pointer 样式、`.cost-dialog` 弹窗样式 |

**弹窗结构**

| 区域 | 展示内容 | 说明 |
|------|----------|------|
| 公式说明 | 每股配售额、配10张需股数、理论股数、实际购买股数、获配每手成本 | 通用公式，强调A股1手=100股整数约束 |
| 当前债券计算 | 每股配售额、正股价、配10张需股数、理论股数、实际需购买股数、成本计算 | 具体数值计算过程 |
| 沪深配售规则 | 沪市按手、深市按张 | 基础规则说明 |
| 一手党（沪市） | 只申购1手需股数和最低成本 | 仅沪市显示 |

---

### 新建成本列规格文档

> 需求：整理可转债配售表「成本」列的完整规格说明，包括字段定义、公式链、数据来源、交互设计和边界条件。

**改动文件**

| 文件 | 改动 |
|------|------|
| `docs/specs/convertible-placement-cost-spec.md` | 新建，共 8 个章节：需求背景、字段定义、公式说明、A股1手=100股整数约束、数据来源链路、交互设计、边界条件、技术债 |

**文档要点**

- 字段定义：`perShare`、`sharesFor10`、`sharesPerLotRaw`、`actualSharesFor1Lot`、`costPerLot` 的计算公式和代码行号
- A股整数约束示例表（500→100、1200→200、3500→400、10000→1000）
- 数据来源链路：东方财富/新浪 API → 后端 `convertible_bond.py` → 前端 Store → 视图层
- 技术债记录：成本计算目前在前端（web 和小程序各一份），建议后续迁移到后端

---

### Web前端项目目录清理与整理

> 需求：清理前端项目根目录，归档测试文件，移动后端补丁到后端项目，完善 .gitignore。

**P0 删除文件**

| 文件 | 原因 |
|------|------|
| `_integration_test.py` | 空文件 |
| `diary-2026-07-08.md` | 违反文档规范 |
| `trading_toolkit.db` | 数据库不应在前端项目 |

**P1 归档整理**

| 操作 | 详情 |
|------|------|
| 创建 `tests/` 目录 | 归档测试文件 |
| 移动 5 个测试文件到 `tests/` | `test_calc_verify.py`, `test_convertible_verify.py`, `test_verify.mjs`, `test_verify.py`, `verify_dark.mjs` |
| 移动截图到 `tests/screenshots/` | 原 `test_screenshots/` 目录内容 |
| 移动 `backend_patch/` 到后端项目 | → `trading-toolkit-service/backend_patch/` |
| 删除 `docs/BACKEND_CICD_GUIDE.md` | 与后端项目重复 |

**P1 .gitignore 新增规则**

- `*.db` — 数据库文件
- `.trae/`、`.qoder/` — IDE 目录
- `start-wangcai.bat`、`start-wangcai.ps1` — 本地脚本
- `tests/screenshots/` — 测试截图产物
- `docs/superpowers/` — docs 下的 superpowers 目录

**P2 验证**

- `npm run build` 编译通过 ✓

---

### 后端项目目录清理与整理

> 需求：清理后端项目根目录，归档测试文件，完善 .gitignore。

**P0 删除文件**

| 文件 | 原因 |
|------|------|
| `debug.log` | 调试日志 |
| `result.json` | 测试残留 |
| `cloudrun/result.json` | 无效JSON |
| `cloudrun/pending_resp.json` | 空文件 |
| `cloudrun/test_result.json` | 测试输出 |
| `trading_toolkit.db` | 根目录数据库 |
| `docs/BACKEND_CICD_GUIDE.md` | 空文件 |

**P1 归档整理**

| 操作 | 详情 |
|------|------|
| 创建 `tests/` 目录 | 归档测试文件 |
| 移动 `test-api.js` → `tests/` | 测试脚本归档 |
| 移动 `DATA_GUIDE.md` → `docs/DATA_GUIDE.md` | 文档归档 |
| `.gitignore` 新增规则 | `.trae/`、`tests/screenshots/`、`result.json`、`test_result.json`、`pending_resp.json` |

**P2 优化**

| 操作 | 详情 |
|------|------|
| 删除 `cloudrun/__pycache__/` | Python 缓存清理 |
| `install_pg.ps1` 添加注释 | 标注硬编码路径需按实际修改 |

**未完成项**

- `cloudrun/trading_toolkit.db` 被进程锁定，无法删除（`.gitignore` 已覆盖 `*.db`）
- `docs/BACKEND_CICD_GUIDE.md` 源文件（web端）不存在，无法移入

---
