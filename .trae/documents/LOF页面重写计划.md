# LOF 页面重写计划（PLAN.md Stage 1.2）

## 概述

按 `PLAN.md` Stage 1.2，重写 **Lof.vue（LOF 基金套利）**，对齐小程序功能但重新设计桌面版 UI，并从设计之初兼容移动端。范围仅限 LOF 列表页，不涉及 HKIPO（用户要求跳过）与详情页。

参考蓝本：`trading-toolkit-mp/miniprogram/pages/lof/`（index.js / index.wxml，作为**数据模型与业务逻辑**的权威来源，不照搬视觉）。

开发完成后启动 dev 服务器弹出预览给用户查看。

## 现状分析（基于实际探查）

### 当前 Lof.vue（src/views/Lof.vue）
- 仅 `el-tabs`（基金列表 / 套利机会）+ 简单申购状态筛选，调用 `store.loadList()`。
- 缺失：市场概览头、4 类 Tab（全部/溢价≥5%/折价/暂停）、行内自选星标、搜索、详情弹窗、套利建议、移动端适配。

### API 模块（src/api/lof.js）
- 现有：`list(params)`、`opportunities()`。
- 缺失：`summary()`（后端 `/api/v1/lof/summary` 已存在）。

### Store（src/stores/lof.js）
- 现有：`fundList / opportunities / loading` + `loadList / loadOpportunities`。
- 需新增：归一化后的 `fundList`、`summary`（市场概览）、`error`、`loadAll()`、`refreshFavorites()`。

### 后端可用端点与字段（已核实）

**`GET /api/v1/lof/list`** → 经 `normalize_lof_list` 标准化，每项字段：
| 字段 | 含义 |
|---|---|
| `code` | 基金代码（已去 sh/sz 前缀） |
| `name` | 基金名称 |
| `price` | 最新价 |
| `change_pct` | 涨跌幅（%） |
| `valuation` | 估值/净值 |
| `premium` | 溢价率（%） |
| `consecutive_premium` | 连续溢价天数 |
| `limit_status` | 申购状态字符串（如 `'暂停'`、`'限100'`、`'不限'`） |
| `exchange` | 交易所（`'沪'`/`'深'`） |

> **已知缺口**：后端 normalizer（`cloudrun/services/normalizer.py:normalize_lof`）未输出 `amount`（成交额）和 `volume`（成交量）。小程序同样缺此字段 → `canArbitrage`（需 amount≥100）始终为 false。前端需优雅处理缺失，显示 `--`，不影响其余功能。

**`GET /api/v1/lof/summary`** → 字段：
| 字段 | 含义 |
|---|---|
| `count` | 基金总数 |
| `premium_avg` | 平均溢价率 |
| `top_premium` | 最高溢价率 |
| `positive_count` | 溢价数 |
| `positive_rate` | 溢价占比（%） |
| `paused_count` | 暂停数 |

### 自选体系（src/stores/user.js）
- `type` 使用 `'lof'`；`isFavorite(type, code)`、`toggleFavorite(type, code, name)`；持久化于 `localStorage`（`user_favorites`）。

### 主题与样式（沿用 Convertible 页面已建立的约定）
- 暗黑：根节点 `.dark` 类；ElementPlus 自动适配；自定义标签需手写 `.dark .x{}`。
- 可用 CSS 变量：`--text-color`、`--text-color-secondary`、`--el-color-danger/success/warning/primary`。
- 现有布局类：`.page-container`（padding 20px）、`.page-header`。
- 溢价率/涨幅红涨绿跌（正=`--el-color-danger`，负=`--el-color-success`）。
- 响应式断点：`@media (max-width: 768px)` 桌面表格→卡片流；弹窗 `fullscreen`。

## 具体变更

### 一、补全 API 方法
**文件**：`src/api/lof.js`
- 新增 `summary() { return api.get('/api/v1/lof/summary') }`。

### 二、重写 Store + 归一化器
**文件**：`src/stores/lof.js`

**新增状态**：`summary`（市场概览对象）、`error`；`fundList` 改为归一化后列表。

**新增动作 `loadAll()`**：
- `Promise.all([lofApi.list(), lofApi.summary()])` → 归一化 → 写入状态；`loading`/`error` 管理。
- summary 兜底：若 `lofApi.summary()` 失败，从 list 本地计算 `count / premium_avg / top_premium / positive_count / paused_count`（与小程序 fallback 逻辑一致）。

**新增 `refreshFavorites()`**：基于 `useUserStore` 重新标记 `isFavorite`。

**模块级归一化函数 `normalizeLofItem(raw)`**（移植小程序 `formatLofItem` 逻辑）：
- `exchange` → 直接用后端值（沪/深）。
- `priceText` → `price.toFixed(3)`。
- `valuationText` → `valuation.toFixed(4)`。
- `spread` → `(price - valuation) / valuation * 100`，格式 `X.XX%`。
- `premiumValue` → 原始数值（排序用）；`premiumText` → `X.XX%`。
- `netPremium` → `premium - 0.15`（暂停时为 null）；`netPremiumText`、`netPremiumClass`（high>3 / 空 / negative≤0）。
- `isPaused` → `limit_status === '暂停'`。
- `isHighlight` → `premium > 10`；`isHighPremium` → `premium > 5`。
- `isChangeUp` → `change_pct > 0`；`changePctText` → `±X.XX%`。
- `canArbitrage` → `premium >= 3 && amount >= 100 && !isPaused`（amount 缺失时为 false）。
- `lowLiquidity` → `amount > 0 && amount < 10`（amount 缺失时为 false）。
- `sustainedPremium` → `consecutive_premium >= 5`。
- `limitAmount` → `limit_status === '限100'` 时为 100，否则 null。
- `amountText` / `amountLevel` → 优雅处理缺失（显示 `--`）。
- `detail` 子对象 → 供弹窗使用（含 `advice` 建议文案）。

**`_getAdvice(item)` 建议生成**（按优先级）：
1. 暂停 → "申购暂停，无法套利。关注恢复申购后的溢价变化。"
2. 可套利 → 溢值+持续性+成交额+操作建议+券商费率+限额提示
3. 微溢价（0 < premium < 3）→ "溢价较低，不足覆盖申购费(0.15%)，建议观望。"
4. 折价（premium < 0）→ "|premium| > 1" 时提示持有≥7天风险；否则"轻微折价，空间有限"
5. 兜底 → "暂无明确套利信号。"

保留现有 `loadList / loadOpportunities`（不删，避免破坏潜在引用）。

### 三、重写 Lof.vue（核心）
**文件**：`src/views/Lof.vue`

**布局结构**（桌面优先，移动响应）：
1. **页面头**：标题"LOF 基金套利" + 搜索输入框（clearable，prefix 搜索图标，实时过滤）。
2. **市场概览头**：6 张统计卡（基金数量 / 平均溢价 / 最高溢价 / 溢价数 / 暂停数 / 可套利数）。用 grid 布局，移动端 2 列。
3. **Tab 栏**：`el-tabs` → 全部 | 溢价≥5% | 折价 | 暂停，标签带计数徽标。
   - 全部：不过滤
   - 溢价≥5%：`premiumValue >= 5`
   - 折价：`premiumValue < 0`
   - 暂停：`isPaused`
4. **桌面表格**（`el-table`，`@media (max-width:768px)` 时隐藏）：
   - 列：交易所徽标 / 基金名称+代码 / 现价+涨跌幅 / 溢价率(高溢价标红) / 净溢价 / 连续溢价 / 申购状态 / 标记(可套利/溢价持续/流动性差 tag) / 自选星标
   - 行点击 → 打开详情弹窗；星标点击 `stop` 冒泡 → 切换自选。
5. **移动卡片流**（`@media (max-width:768px)` 时显示）：
   - 每条 `el-card`：名称+代码+交易所 / 溢价率(大字) / 现价+涨跌 / 净溢价+连续溢价 / 状态+标记 tag / 星标
6. **详情弹窗**（`el-dialog`，移动端 `fullscreen`）：
   - 头部：基金名称 + (代码)
   - ① 基金概要：交易所 / 申购状态 / 申购限额 / 赎回规则（深市 T+1 / 沪市当天）
   - ② 价格与净值：当前价 / 基金净值 / 价格偏离 / 毛溢价率 / 净溢价（前 4 项高亮背景）
   - ③ 流动性数据：成交额 / 成交量 / 连续溢价（缺失显示 `--`）
   - ④ 操作建议：advice 文案（绿底框）

**脚本逻辑**（`<script setup>`）：
- 引入 `useLofStore`、`useUserStore`、`formatNumber/formatPercent/formatMoney/formatColor`。
- `onMounted` → `store.loadAll()`；`onActivated` → `store.refreshFavorites()`。
- 本地状态：`activeTab`（默认 `all`）、`searchKeyword`、`detailVisible`、`detailData`、`isMobile`。
- 计算属性：`currentList`（按 Tab + 搜索过滤）、`tabStats`（各 Tab 计数）。
- 方法：`switchTab`、`openDetail(item)`、`toggleFav(code,name)`、`statusTagType(status)`、`exchangeClass(ex)`。

**样式**（`<style lang="scss" scoped>`）：
- 桌面表格列宽合理；移动端 `@media (max-width: 768px)` 隐藏 `el-table`，显示卡片流；弹窗 `fullscreen`。
- 交易所圆标：沪=红 `#d4380d`，深=蓝 `#0958d9`。
- 行内 tag：可套利=绿、溢价持续=蓝、流动性差=黄。
- 溢价率红涨绿跌；高溢价(>10%)整行浅红底色。
- 暗黑：对自绘色块补 `.dark .xxx{}` 覆写。

## 文件变更汇总

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/api/lof.js` | 修改 | 新增 `summary()` |
| `src/stores/lof.js` | 修改 | 新增 `loadAll`/归一化器/`summary`/`refreshFavorites` |
| `src/views/Lof.vue` | 重写 | 市场概览头 + 4 Tab + 搜索 + 自选星标 + 详情弹窗 + 桌面/移动响应 |

**不新增文件、不新增 npm 依赖。** 路由 `/lof` 与侧边栏菜单已存在，无需改动。

## 假设与决策

1. **数据模型权威**：以后端实际返回字段为准，字段名以小程序 `formatLofItem` 为参照。
2. **归一化置于 Store**：保持视图干净；归一化函数作为 store 文件内模块级函数。
3. **自选 type**：统一用 `'lof'`（web 现有约定）。
4. **amount/volume 缺失**：后端 normalizer 未输出此二字段；前端优雅处理（显示 `--`，`canArbitrage`/`lowLiquidity` 为 false）。与小程序行为一致。
5. **summary 兜底**：若 `lofApi.summary()` 失败，从 list 本地计算概览字段。
6. **移动端策略**：`@media (max-width:768px)` 切换为卡片流 + 弹窗 `fullscreen`。
7. **不照搬小程序视觉**：按桌面端最佳实践重排信息密度，仅复用数据字段与业务规则。
8. **套利机会 Tab**：小程序无独立"套利机会"Tab，而是在行内用 `canArbitrage` tag 标记 + 弹窗 advice。Web 沿用此设计，不新建独立 Tab。

## 验证步骤

1. `npm run build` 通过（无编译错误）。
2. `npm run dev` 启动后弹出预览给用户查看：
   - LOF 页加载，市场概览头显示真实数值（验证 summary 接口）。
   - 4 个 Tab 切换，计数徽标与列表正确。
   - 行点击 → 弹出详情弹窗，4 个 section 显示正确；advice 文案合理。
   - 自选星标：点击切换并 Toast，刷新页面后持久化；`onActivated` 调 `refreshFavorites`。
   - 搜索：实时过滤当前 Tab。
3. 响应式：浏览器宽度 <768px 时表格变卡片流，弹窗全屏。
4. 暗黑模式：切换后所有自绘标签（交易所/行内 tag/高亮行）配色正确。
5. 回归：Convertible 页不受影响（共享 axios 拦截器已修复）。
