# Convertible 页面重写计划（PLAN.md Stage 1.1 试点）

## 概述

按 `PLAN.md` Stage 1.1，以 **Convertible.vue（可转债）单页** 作为试点重写，对齐小程序功能但 **重新设计桌面版 UI，并从设计之初兼容移动端**。范围仅限可转债列表页 + 必要的基础设施修复，不涉及 Lof/Hkipo/详情页。

参考蓝本：`trading-toolkit-mp/miniprogram/pages/convertible/`（index.js / index.wxml，作为**数据模型与业务逻辑**的权威来源，不照搬视觉）。

## 现状分析（基于实际探查）

### 当前 Convertible.vue（src/views/Convertible.vue）
- 仅一个 `el-table` + 简单筛选（信号下拉/排序/方向），调用 `store.loadBonds()` → `convertibleApi.list`。
- 缺失：市场温度头、信号 Tab（配售/双低/强赎/折价/下修）、配售子 Tab+排序、行内自选星标、搜索、待发配售弹窗详情、移动端适配。

### 关键基础设施 Bug（必须先修）
- `src/api/index.js` 响应拦截器 `response => response.data` 返回的是后端统一信封 `{ success, data, meta }`（见 `trading-toolkit-service/cloudrun/utils/response.py` 的 `api_response`）。
- 但所有共享 `api` 消费方都按**已解包的内层 data** 使用：
  - `stores/convertible.js` `loadBonds`: `data.items`、`data.total`
  - `stores/lof.js` `loadList`: `data.items`
  - `views/Home.vue`: `data.bondCount`、`data.lofCount`、`flow.items`、`s.value`
- 结果：当前这些页面拿到的都是 `undefined`，列表为空、概览卡片显示 `--`。这是潜在 bug。
- 安全性已核实：`ApiLog.vue` 与 `Settings.vue` 的 `result.success` 走**独立 axios 实例 / store 函数**，不读共享信封；全仓 `src` 内无共享 `api` 消费方读取 `.success/.meta/.cached`。故解包拦截器是安全的，且会顺带修复 Home/Lof/Hkipo。

### API 模块（src/api/convertible.js）
- 现有：`list / signals / temperature / detail`。
- 缺失：`pending`（后端 `/api/v1/convertible/pending` 已存在，见 `cloudrun/app.py:314`）。

### Store（src/stores/convertible.js）
- 现有：`bondList / signals / temperature / loading / pagination` + `loadBonds / loadSignals / loadTemperature`。
- 需新增：归一化后的 `signals`（5 类）、`pendingList`、`marketTemp`、`loadAll()`。

### 后端可用端点（均已存在）
- `GET /api/v1/convertible/signals` → `{ placement, double_low, force_redeem, discount, down_revised }`（各为列表）
- `GET /api/v1/convertible/pending` → 待发/配售列表数组
- `GET /api/v1/market/overview` → `convertible_bond: { count, price_median, premium_median, double_low_median, market_status }`
- `GET /api/v1/convertible/list` → 全量列表（保留，供"查看全部"备用）

### 数据字段（权威来源：小程序 formatBondItem / formatPendingItem）
- 信号项：`bond_code, bond_name, stock_name, stock_code, price, conversion_value, premium_rate, double_low, conversion_price, stock_price, pure_bond_value, ytm, rating, hundred_right, lot_stock_count, safety_pad, exchange`
- 待发项：`stock_name, stock_code, bond_code, bond_name, progress/status, issue_size, rating, shareholder_ratio, stock_price, stock_change, conversion_price, pb, per_share_allocation, shares_for_10_lots, registration_date, online_issue_size, win_rate, risk_level(high/mid/low), record_price, ma20_price, safety_pad, expected_profit, stock_cash_ratio(百元含权, 兜底 per_share/stock_price*100)`

### 自选体系（src/stores/user.js）
- `type` 使用 `'convertible'`（非小程序的 `'bond'`）；`isFavorite(type, code)`、`toggleFavorite(type, code, name)`；持久化于 `localStorage`（`user_favorites`）。

### 主题与样式
- 暗黑：根节点 `.dark` 类（见 `global.scss`）；ElementPlus 自动适配；自定义标签需手写 `.dark .x{}`。
- 可用 CSS 变量：`--text-color`、`--text-color-secondary`、`--el-color-danger/success/warning/primary`。
- 现有布局类：`.page-container`（padding 20px）、`.page-header`。
- 可复用组件：`src/components/Card.vue`（stat 卡片，已带暗黑适配）。

## 具体变更

### 一、修复 axios 响应拦截器（前置必做）
**文件**：`src/api/index.js`
- 将 `response => response.data` 改为：当 `response.data.success` 为真时返回 `response.data.data`（解包内层）；`success === false` 时按错误流程 reject（保留 `ElMessage.error`）。
- 保留现有请求拦截器（`cloudRunUrl` 动态 baseURL）与错误提示。
- **影响**：修复 Convertible/Home/Lof/Hkipo 取不到数据的潜在 bug；不影响 ApiLog/Settings（独立实例）。

### 二、补全 API 方法
**文件**：`src/api/convertible.js`
- 新增 `pending() { return api.get('/api/v1/convertible/pending') }`。

### 三、重写 Store + 归一化器
**文件**：`src/stores/convertible.js`
- 新增状态：`pendingList`（归一化后）、`marketTemp`、`error`；`signals` 改为归一化后的 5 类结构。
- 新增动作 `loadAll()`：`Promise.all([convertibleApi.signals(), convertibleApi.pending(), marketApi.overview()])` → 归一化 → 写入状态；`loading`/`error` 管理。
- 新增 `refreshFavorites()`：基于 `useUserStore` 重新标记 `isFavorite`。
- 新增模块级归一化函数（移植小程序逻辑，保留数值原始量用于排序）：
  - `normalizeBondItem(raw)` → 计算 `exchange`、`premium`/`premiumNum`、`doubleLowNum`、`forceRedemptionGap`/`_forcePriceGap`、`downReviseGap`/`_revisePriceGap`、`discountSpace`、`safetyPad`、`ytm` 等。
  - `normalizePendingItem(raw)` → 计算 `cashRatio`/`_cashRatioRaw`、`safetyPad`/`_safetyPadRaw`、`expectedProfit`、`stockTrend`、`exchange`、`oneHandParty`、`costFor10Lots`、`riskLabel/riskClass`、`_compositeRankRaw`、`stageList`、`sectorTag/isHotSector`、`regBadge`。
- 各信号 Tab 排序：`_sortByBest`（双低按 doubleLow 升序、强赎按距强赎绝对值升序、折价按 premium 升序、下修按距下修绝对值升序）。
- 保留现有 `loadBonds/loadSignals/loadTemperature/pagination`（不删，避免破坏潜在引用）。

### 四、重写 Convertible.vue（核心）
**文件**：`src/views/Convertible.vue`

**布局结构**（桌面优先，移动响应）：
1. **市场温度头**：`el-row` 4 张统计卡（在市转债数 / 价格中位数 / 溢价中位数 / 双低中位数）+ 右上 `marketStatus` 标签。复用 `Card.vue` 或自绘 stat 块。
2. **信号 Tab 栏**：`el-tabs` → 配售 | 双低 | 强赎 | 折价 | 下修，标签带数量徽标（点击切换 `currentTab`）。
3. **投资指引条**：随 Tab 切换的 `el-alert`（info）一句话策略说明（文案取自小程序 wxml）。
4. **搜索栏**：`el-input`（clearable，prefix 搜索图标），实时过滤当前 Tab 列表（按 bond_name/bond_code/stock_name）。
5. **配售 Tab 内容**：
   - 子 Tab（`el-radio-group`/按钮组）：全部 / 申购中 / 待上市 / 审批中（带计数）。
   - 排序按钮组：推荐 / 含权 / 安全垫 / 规模 / 涨幅（带 ↑↓ 状态）。
   - 桌面：`el-table`（正股名称/代码、现价/涨幅、百元含权、安全垫、预估收益、每股配售、配10手≈成本、规模、风险标签、进度）。行点击 → 打开待发详情弹窗。
   - 移动：卡片流（每条 `el-card`，核心指标分行）。
6. **其他 Tab 内容（双低/强赎/折价/下修）**：
   - 桌面：`el-table`（转债名称/代码/正股、价格/正股价、溢价率、Tab 专属列：双低值 / 距强赎 / 折价空间 / 距下修、自选星标列）。行点击 → `/convertible/:code`；星标点击 `stop` 冒泡 → 切换自选。
   - 默认显示前 15 条，底部"查看全部"按钮展开全部。
   - 移动：卡片流。
7. **待发详情弹窗**（`el-dialog`，移动端 `fullscreen`）：
   - 预期上市溢价率滑块（`el-slider` 10–50，步长 5）→ 实时重算 `safetyPad`/`expectedProfit`（按小程序 `onPremiumRateChange` 公式）。
   - 板块标签（`sectorTag`，热门加🔥）。
   - 发行时间轴（`el-steps`，7 阶段 done/current/pending）。
   - 核心指标网格（百元含权 / 安全垫 / 预估收益(10张) / 每股配售 / 配10张需 / 登记日基准价）。
   - 正股风险网格（正股价 / 涨幅 / PB / vs20日均价 / 20日均价）。
   - 发行信息网格（转债名/代码 / 方案进展 / 规模 / 评级 / 股东配售率 / 转股价 / 登记日（可复制）/ 网上规模 / 中签率）。

**脚本逻辑**（`<script setup>`）：
- 引入 `useConvertibleStore`、`useUserStore`、`useRouter`、`formatNumber/formatPercent/formatColor` 等。
- `onMounted` → `store.loadAll()`；`onActivated`/`onShow` 等价 → `store.refreshFavorites()`。
- 本地状态：`activeTab`（默认 `placement`）、`placementSubTab`、`placementSortBy`/`Asc`、`searchKeyword`、`showAll`、`pendingDetail`（弹窗模型）、`premiumRate`。
- 计算属性：`currentList`（按 Tab+子 Tab+排序+搜索+showAll 派生）、`placementTabStats`。
- 方法：`switchTab`、`switchPlacementSub`、`toggleSort(field)`、`openPendingDetail(item)`、`closePending`、`onPremiumRateChange`、`toggleFav(code,name)`、`goDetail(code)`、`copyText(text)`（`navigator.clipboard.writeText`）。

**样式**（`<style lang="scss" scoped>`）：
- 桌面表格列宽合理；移动端 `@media (max-width: 768px)` 隐藏 `el-table`，显示卡片流；弹窗 `fullscreen`。
- 自定义标签（交易所圆标 沪/深/京、风险标签 high/mid/low、板块标签、登记日徽标 hot/warm、进度点）用 CSS 变量配色，`.dark` 下覆写。
- 溢价率/涨幅红涨绿跌（沿用 `formatColor` 约定：正=`--el-color-danger`，负=`--el-color-success`）。
- 暗黑：对自绘色块补 `.dark .xxx { background/color }` 覆写。

## 文件变更汇总

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/api/index.js` | 修改 | 响应拦截器解包 `response.data.data`，`success:false` 走错误流 |
| `src/api/convertible.js` | 修改 | 新增 `pending()` |
| `src/stores/convertible.js` | 修改 | 新增 `loadAll`/归一化器/`pendingList`/`marketTemp`/`refreshFavorites` |
| `src/views/Convertible.vue` | 重写 | 市场温度头 + 信号 Tab + 配售子Tab/排序 + 搜索 + 自选星标 + 待发弹窗 + 桌面/移动响应 |

**不新增文件、不新增 npm 依赖。** 路由 `/convertible` 与侧边栏菜单已存在，无需改动。

## 假设与决策

1. **数据模型权威**：以后端实际返回字段为准，字段名以小程序 `formatBondItem`/`formatPendingItem` 为参照（它们消费同一后端 API）。
2. **归一化置于 Store**：保持视图干净，便于 `refreshFavorites` 复用；归一化函数作为 store 文件内模块级函数，不新建 utils 文件。
3. **自选 type**：统一用 `'convertible'`（web 现有约定），非小程序的 `'bond'`。
4. **信号 Tab 展示**：默认前 15 条 + "查看全部"展开（对齐 PLAN.md）；配售 Tab 展示全部待发项。
5. **拦截器解包**：安全（已核实无共享 `api` 消费方读信封）；顺带修复 Home/Lof/Hkipo。
6. **移动端策略**：`@media (max-width:768px)` 切换为卡片流 + 弹窗 `fullscreen`；中屏(769–1199)精简表格列；大屏(≥1200)完整列。
7. **"查看全部"全量列表**：保留 `convertible/list` 与 `loadBonds`，本试点不作为主流程（信号 Tab 已有 curated 列表）。
8. **剪贴板**：用 `navigator.clipboard.writeText`（localhost/HTTPS 可用）。
9. **不照搬小程序视觉**：按桌面端最佳实践重排信息密度，仅复用数据字段与业务规则。

## 验证步骤

1. `npm run build` 通过（无编译错误）。
2. `npm run dev`：
   - 可转债页加载，市场温度头显示真实数值（验证拦截器解包生效）。
   - 5 个信号 Tab 切换，数量徽标与列表正确；默认前 15 条，"查看全部"展开。
   - 配售 Tab：子 Tab 切换、5 个排序按钮带 ↑↓ 切换；行点击弹出待发详情。
   - 待发弹窗：溢价率滑块实时更新安全垫/预估收益；时间轴/板块/各指标网格显示；登记日可复制。
   - 自选星标：点击切换并 Toast，刷新页面后持久化；`onActivated` 调 `refreshFavorites`。
   - 行点击（非配售 Tab）→ 跳转 `/convertible/:code`。
   - 搜索：实时过滤当前 Tab。
3. 响应式：浏览器宽度 <768px 时表格变卡片流，弹窗全屏；769–1199 列精简；≥1200 完整。
4. 暗黑模式：切换后所有自绘标签（交易所/风险/板块/登记徽标/进度点）配色正确。
5. 回归：首页概览卡、LOF 列表因拦截器修复开始显示真实数据。
