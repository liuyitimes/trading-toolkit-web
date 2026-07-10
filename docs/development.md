# Trading Toolkit Web — 前端开发文档

> 最后更新：2026-07-09

---

## 1. 项目概述

旺财百宝箱 Web 版，基于 **Vue 3 + Vite + Element Plus + Pinia** 构建的投资工具前端，提供可转债、LOF 基金、港股打新、封闭式基金等模块的数据展示与分析。

### 技术栈

| 领域 | 选型 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | ^3.5 |
| 构建 | Vite | ^8.1 |
| UI 组件库 | Element Plus | ^2.14 |
| 状态管理 | Pinia | ^3.0 |
| HTTP | Axios | ^1.18 |
| 路由 | Vue Router | ^4.6 |
| 样式 | SCSS + CSS Variables | sass ^1.101 |
| 图标 | @element-plus/icons-vue | ^2.3 |

---

## 2. 目录结构

```
src/
├── api/              — API 接口封装（每个模块一个文件）
│   ├── index.js      — Axios 实例（统一 baseURL、拦截器）
│   ├── market.js     — 市场概览接口
│   ├── convertible.js — 可转债接口
│   ├── lof.js        — LOF 基金接口
│   ├── hkipo.js      — 港股打新接口
│   ├── closedEnd.js  — 封闭式基金接口
│   └── user.js       — 用户接口
├── assets/styles/    — 全局样式（global.scss 等）
├── components/       — 可复用组件
│   ├── Layout.vue        — 主布局（侧边栏 + Header）
│   ├── FormulaInfo.vue   — 列头公式提示组件（hover 弹出）
│   ├── FormulaRecall.vue — 公式回忆（检索练习）组件
│   ├── SensitivitySlider.vue — 敏感度滑块组件
│   ├── TierBadge.vue     — 新手/进阶徽章
│   ├── TimeStamp.vue     — 时间戳组件（含过期提示）
│   ├── Calendar.vue      — 日历组件
│   ├── Card.vue          — 通用卡片
│   ├── QuoteCarousel.vue — 名言轮播
│   ├── SentimentGauge.vue — 情绪仪表盘
│   ├── ArbitrageChart.vue — 套利图表
│   └── floating/         — 浮动面板组件
├── data/             — 静态数据
├── router/           — 路由配置
│   └── index.js      — 路由定义（11 个页面）
├── stores/           — Pinia Store（状态管理）
│   ├── app.js        — 应用全局状态（主题、最后更新时间）
│   ├── convertible.js — 可转债（含归一化逻辑）
│   ├── lof.js        — LOF 基金
│   ├── hkipo.js      — 港股打新
│   ├── closedEnd.js  — 封闭式基金
│   ├── user.js       — 用户（自选、登录）
│   └── floating.js   — 浮动面板
├── utils/            — 工具函数
│   ├── baseUrl.js    — 环境 baseURL 配置
│   ├── cache.js      — 缓存工具
│   ├── format.js     — 格式化工具
│   ├── quoteManager.js — 名言 CRUD（localStorage）
│   └── theme.js      — 主题切换
├── views/            — 页面级组件
│   ├── Home.vue          — 首页（市场概览）
│   ├── Convertible.vue   — 可转债（配售/信号 Tab）
│   ├── BondDetail.vue    — 可转债详情
│   ├── Lof.vue           — LOF 基金
│   ├── ClosedEnd.vue     — 封闭式基金
│   ├── Hkipo.vue         — 港股打新
│   ├── HkipoDetail.vue   — 港股打新详情
│   ├── Favorites.vue     — 自选管理
│   ├── Settings.vue      — 设置
│   ├── QuoteManage.vue   — 名言管理
│   └── ApiLog.vue        — 接口日志
├── App.vue           — 根组件
└── main.js           — 入口文件
```

---

## 3. 数据流

```
View (Vue SFC, src/views/)
  ↓ 调用
Store (Pinia, src/stores/)  — 状态管理 + 数据归一化
  ↓ 调用
API (Axios, src/api/)       — HTTP 请求
  ↓
Backend (Flask CloudRun)    — 后端 API
```

### 3.1 API 层（src/api/）

每个模块一个文件，导出命名对象。统一通过 `src/api/index.js` 的 Axios 实例发起请求。

```javascript
// src/api/convertible.js
export const convertibleApi = {
  list(params)   { return api.get('/api/v1/convertible/list', { params }) },
  signals()      { return api.get('/api/v1/convertible/signals') },
  temperature()  { return api.get('/api/v1/convertible/temperature') },
  detail(code)   { return api.get(`/api/v1/convertible/detail/${code}`) },
  pending()      { return api.get('/api/v1/convertible/pending') }
}
```

### 3.2 Store 层（src/stores/）

使用 Pinia Composition API 风格。Store 负责：
1. 调用 API 获取原始数据
2. **数据归一化**：将后端字段映射为前端展示字段（核心逻辑）
3. 管理加载状态（loading / error）

```javascript
// src/stores/convertible.js
export const useConvertibleStore = defineStore('convertible', () => {
  const pendingList = ref([])    // 归一化后的配售列表
  const signals = ref({})        // 归一化后的信号数据
  const loading = ref(false)

  async function loadAll() { /* 并行请求多个接口 */ }
  // ...
})
```

### 3.3 View 层（src/views/）

页面组件从 Store 读取归一化后的数据，负责渲染和用户交互。视图层不做业务计算，仅做排序、筛选等展示逻辑。

---

## 4. 关键组件说明

### 4.1 FormulaInfo.vue

列头公式提示组件，hover 时弹出公式说明浮层。

**Props**：
| 属性 | 类型 | 说明 |
|------|------|------|
| `formula` | String | 公式文本 |
| `example` | String | 计算示例 |
| `note` | String | 补充说明 |

**使用场景**：信号 Tab 表格列头（溢价率、双低值、距强赎等）。

```vue
<el-table-column>
  <template #header>
    溢价率<FormulaInfo formula="..." example="..." note="..." />
  </template>
</el-table-column>
```

### 4.2 配售表格（Convertible.vue）

可转债配售 Tab 使用 `el-table` 展示，核心交互模式：

- **el-tooltip**：安全垫、百元含权、首日可交易量等列 — hover 展示公式说明
- **el-dialog**：成本列 — 点击弹出完整公式弹窗（含 A 股整数约束说明）
- **行点击**：打开发行详情弹窗（含进度时间线、风险等级、板块标签）

### 4.3 SensitivitySlider.vue

策略沙盘敏感度滑块，用于双低值参数演练（转债价格、溢价率、转股价）。

---

## 5. 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/home` | Home.vue | 首页（市场概览） |
| `/convertible` | Convertible.vue | 可转债（配售/信号） |
| `/convertible/:code` | BondDetail.vue | 可转债详情 |
| `/lof` | Lof.vue | LOF 基金 |
| `/closed-end` | ClosedEnd.vue | 封闭式基金 |
| `/hkipo` | Hkipo.vue | 港股打新 |
| `/hkipo/:code` | HkipoDetail.vue | 港股打新详情 |
| `/favorites` | Favorites.vue | 自选管理 |
| `/settings` | Settings.vue | 设置 |
| `/quote-manage` | QuoteManage.vue | 名言管理 |
| `/api-log` | ApiLog.vue | 接口日志 |

---

## 6. 开发环境

### 安装与启动

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

### 环境变量

- `.env.development` — 开发环境（API 指向 localhost:8080）
- `.env.production` — 生产环境

---

## 7. 代码规范

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `FormulaInfo.vue` |
| Store 文件 | camelCase | `convertible.js` |
| API 文件 | camelCase | `convertible.js` |
| Store 导出 | `use` + PascalCase | `useConvertibleStore` |
| API 导出 | camelCase + `Api` | `convertibleApi` |
| 归一化函数 | `normalize` + 类型 | `normalizePendingItem`、`normalizeBondItem` |
| 原始值字段 | 下划线前缀 | `_stockPriceRaw`、`_costPerLotRaw` |

### 数据归一化约定

- Store 层的归一化函数负责将后端 snake_case 字段映射为前端 camelCase
- 原始数值以 `_xxxRaw` 命名，用于弹窗公式展示
- 格式化后的展示字符串带单位（如 `'129.93元'`、`'5.20%'`）
- 无数据时统一返回 `'--'`（数值列）或 `'暂无'`（弹窗详情）

---

## 8. 可转债模块数据归一化流程

### 8.1 配售列表（normalizePendingItem）

```
后端 /api/v1/convertible/pending
  ↓ 原始字段（snake_case）
  ↓ stock_name, stock_code, per_share_allocation, shares_for_10_lots, stock_price ...
  ↓
normalizePendingItem()
  ↓ 字段映射 + 计算
  ↓ perShare, sharesFor10, sharesPerLotRaw, actualSharesFor1Lot, costPerLot
  ↓ cashRatio, safetyPad, expectedProfit, stockTrend, riskLevel ...
  ↓ 交易所判定、板块检测、登记日徽标、进度时间轴
  ↓
前端展示字段（camelCase，带格式化）
```

### 8.2 信号列表（normalizeBondItem）

```
后端 /api/v1/convertible/signals
  ↓ 4 类信号：double_low, force_redeem, discount, down_revised
  ↓
normalizeBondItem()
  ↓ 字段映射 + 强赎/下修距离计算 + 折价空间
  ↓
前端展示
```

### 8.3 关键计算函数

| 函数 | 位置 | 说明 |
|------|------|------|
| `normalizePendingItem()` | stores/convertible.js L193 | 配售项归一化 |
| `normalizeBondItem()` | stores/convertible.js L104 | 信号项归一化 |
| `computeSafetyPad()` | stores/convertible.js L92 | 安全垫计算 |
| `detectExchange()` | stores/convertible.js L9 | 交易所判定 |
| `detectSector()` | stores/convertible.js L82 | 板块检测 |
| `parseProgressDates()` | stores/convertible.js L33 | 进度日期解析 |
