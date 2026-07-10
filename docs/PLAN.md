# 旺财百宝箱 Web 版 — 迁移计划

## 一、现状总结

### 已完成（Web 脚手架）
| 模块 | 状态 | 说明 |
|------|------|------|
| Vue 3 + Vite + Element Plus + Pinia | ✅ | 基础框架 |
| 路由（8 个页面） | ✅ | /home, /convertible, /convertible/:code, /lof, /hkipo, /hkipo/:code, /favorites, /settings |
| Layout 侧边栏 + Header | ✅ | 含折叠/暗黑切换 |
| 5 个组件 | ✅ | Calendar, Card, QuoteCarousel, SentimentGauge, Layout |
| 6 个 API 模块 | ✅ | market, convertible, lof, hkipo, user, index(axios实例) |
| 5 个 Pinia Store | ✅ | app, convertible, lof, hkipo, user |
| 3 个 utils | ✅ | format, cache, theme |
| 暗黑模式 CSS | ✅ | Element Plus 暗黑变量 + global.scss |

### 待完成（对照小程序）

| # | 功能 | 小程序 | Web | 优先级 |
|---|------|--------|-----|--------|
| 1 | 首页 - 市场概览 4 卡片（可转债/LOF/IPO/温度） | ✅ | 基础框架 | P0 |
| 2 | 首页 - 市场情绪仪表盘 | ✅ | 基础框架 | P0 |
| 3 | 首页 - 名言轮播（支持编辑/管理） | ✅ | 硬编码 | P1 |
| 4 | 首页 - IPO 日历/打新查询/中签查询 | ✅ | ❌ | P1 |
| 5 | 首页 - 资金流向日历 | ✅ | ❌ | P2 |
| 6 | 可转债 - 信号 Tab（配售/双低/强赎/折价/下修） | ✅ | ❌ | P0 |
| 7 | 可转债 - 待发/配售子 Tab（含排序、筛选、综合评分） | ✅ | ❌ | P0 |
| 8 | 可转债 - 搜索 + 自选 | ✅ | ❌ | P1 |
| 9 | 可转债 - 详情页（完整字段 + 时间线 + 配售信息） | ✅ | 基础框架 | P1 |
| 10 | LOF - 溢价/折价/暂停 Tab + 统计 | ✅ | ❌ | P0 |
| 11 | LOF - 套利机会 Tab + 详细建议 | ✅ | ❌ | P1 |
| 12 | LOF - 弹窗详情 + 搜索 + 自选 | ✅ | ❌ | P1 |
| 13 | 港股 IPO - 暗盘 Tab + 孖展/认购倍数排序 | ✅ | ❌ | P0 |
| 14 | 港股 IPO - 详情页（认购/孖展/暗盘/时间线/中签） | ✅ | 基础框架 | P1 |
| 15 | 港股 IPO - 订阅状态/中签追踪 | ✅ | ❌ | P2 |
| 16 | 自选管理 - 本地 + 后端双向同步 | ✅ | 仅本地 | P2 |
| 17 | 名言管理（QuoteManage CRUD + 重置） | ✅ | ❌ | P2 |
| 18 | API 日志查看器 | ✅ | ❌ | P3 |
| 19 | 设置 - 默认 Tab / 提醒配置 / 云 URL 配置 | ✅ | 仅暗黑 | P2 |
| 20 | 响应式移动端适配 | N/A | ❌ | P2 |
| 21 | 全局暗黑模式（完整 CSS 变量） | ✅ | 基础 | P1 |

---

## 二、后端 API 对照

后端 (cloudrun/app.py) 已提供全部所需接口，Web 端需补齐调用：

| API 路径 | 当前 Web | 备注 |
|----------|---------|------|
| `GET /api/v1/market/overview` | ✅ market.js | 含 cb/lof/ipo/sentiment/flow |
| `GET /api/v1/market/sentiment` | ✅ market.js | |
| `GET /api/v1/market/fund-flow` | ✅ market.js | |
| `GET /api/v1/convertible/list` | ✅ convertible.js | 支持 sort/min_price/max_price 等 |
| `GET /api/v1/convertible/signals` | ✅ convertible.js | 返回 5 类信号数据 |
| `GET /api/v1/convertible/temperature` | ✅ convertible.js | |
| `GET /api/v1/convertible/detail/:code` | ✅ convertible.js | |
| `GET /api/v1/convertible/pending` | ✅ convertible.js | 含配售数据归一化 |
| `GET /api/v1/lof/list` | ✅ lof.js | |
| `GET /api/v1/lof/opportunities` | ✅ lof.js | |
| `GET /api/v1/lof/summary` | ❌ | **需补充** |
| `GET /api/v1/hkipo/list` | ✅ hkipo.js | |
| `GET /api/v1/hkipo/upcoming` | ✅ hkipo.js | |
| `GET /api/v1/hkipo/summary` | ❌ | **需补充** |
| `GET /api/v1/hkipo/detail/:code` | ❌ hkipo.js 无此方法 | **需补充** |
| `POST /api/v1/user/login` | ❌ | **需补充** |
| `GET/POST/DELETE /api/v1/user/favorites` | ❌ | **需补充** |
| `GET/POST/PUT/DELETE /api/v1/user/reminders` | ❌ | **需补充** |
| `GET/PUT /api/v1/user/settings` | ❌ | **需补充** |
| `GET /api/v1/admin/health` | ❌ | **需补充** |
| `GET /api/v1/admin/api-logs` | ❌ | **需补充** |
| `POST /api/v1/admin/api-logs/clear` | ❌ | **需补充** |

---

## 三、阶段开发计划

### Stage 1 — 核心功能补齐（P0）
目标：3 个主列表页与小程序功能对齐

#### 1.1 Convertible.vue 重写
- 市场温度头部卡片（与概览 API 联动）
- 上方信号 Tab 栏：配售 | 双低 | 强赎 | 折价 | 下修
- 配售 Tab 下：全部/申购中/待上市/已通过 子 Tab + 排序（百元含权/安全垫/规模/正股趋势/综合评分） + 入场费 + 一手党标记
- 信号 Tab 下：各信号列表（最多 15 条）+ "查看全部"展开
- 行内自选星标（与 user store 联动）
- 搜索栏 + 实时筛选
- 底部待发配售弹窗详情（含进度时间线、风险等级、板块标签）

#### 1.2 Lof.vue 重写
- 市场概览头部卡片（溢价均值/最高溢价/套利机会数/暂停数）
- Tab：全部 | 溢价(>=5%) | 折价(<0) | 暂停申购
- 每行展示：价格/净值/溢价率/净溢价/连续溢价天数/成交额/流动性标记
- 套利机会 Tab：可套利标的列表 + 套利策略 + 预期收益 + 风险提示
- 弹窗详情：完整字段 + 套利操作建议（含预计收益计算、限额说明）
- 搜索 + 自选 + 排序

#### 1.3 Hkipo.vue 重写
- Tab：全部 | 申购中 | 待上市 | 已上市 | 暗盘
- 暗盘数据嵌入列表行
- 认购倍数/暗盘涨跌幅排序
- 超额认购倍数高亮
- 搜索 + 自选
- 行点击跳转详情

---

### Stage 2 — 详情页与自选（P1）
#### 2.1 BondDetail.vue 重写
- 基础信息表（代码/正股/价格/转股价值/溢价率/到期收益/剩余规模/双低值）
- 强制赎回进度（距 130% 差幅）
- 下修进度（距 85% 差幅）
- 折价空间计算
- 条款信息面板（强赎条款/回售条款/下修条款）
- 自选按钮

#### 2.2 HkipoDetail.vue 重写
- 基础信息表（代码/发行价/一手/入场费/募资额）
- 认购数据（超额/孖展/一手中签率/申购人数）
- 暗盘行情
- 发行进度时间线
- 订阅/中签状态切换（配合 local 存储）
- 自选按钮

#### 2.3 首页加强
- 名言轮播接入 quoteManager（localStorage CRUD）
- 资金流向日历对接 fundFlow API
- IPO 日历（近期待发/申购中可转债 + 港股 IPO）
- 打新查询入口（可转债配售/港股中签）
- 可选：市场情绪仪表盘完善

---

### Stage 3 — 用户系统 + 管理功能（P2）
#### 3.1 设置页
- 默认启动 Tab 选择
- 云托管 URL 配置
- 提醒设置（开启/关闭）
- 缓存管理（当前已有）
- 关于信息

#### 3.2 自选管理增强
- localStorage + 后端 API 双向同步
- 添加时同步记录 price/premium_rate
- 可转债/LOF/港股 分 Tab 展示
- 移除确认

#### 3.3 名言管理页（新增路由）
- 列表展示
- 添加/编辑弹窗
- 删除（确认弹窗）
- 恢复默认

---

### Stage 4 — 运维 + 体验（P2/P3）
#### 4.1 API 日志查看页（新增路由）
- 日志列表（请求时间/方法/路径/状态码/耗时）
- 请求/响应体展开查看
- 搜索过滤
- 清空日志

#### 4.2 响应式适配
- 小屏(<768px)：侧边栏自动折叠、表格卡片化、弹窗全屏
- 中屏(768-1200px)：侧边栏可折叠、合理间距
- 大屏(>1200px)：桌面完整布局

#### 4.3 暗黑模式完善
- 全局 CSS 变量覆盖
- 所有卡片/表格/弹窗适配
- 过度动画平滑

---

## 四、架构建议

### 数据流
```
View (Vue SFC)
  → Store (Pinia)  — 本地状态管理 + 缓存
    → API (axios)  — HTTP 请求
      → Backend (Flask CloudRun)
```

### 关键约定
1. **API 响应格式**：后端返回 `{ success, data, meta: { source, cached } }`，axios 拦截器已统一取 `data`
2. **自选同步**：优先 localStorage（离线可用），用户登录后可选同步到后端
3. **缓存策略**：前端 Store 层面做 SWR（stale-while-revalidate），后端已有缓存
4. **主题**：CSS 变量方案，跟随系统偏好 + 手动切换

### 文件组织
```
src/
  views/          — 页面级组件
  components/     — 可复用组件（建议按功能拆分子目录）
  stores/         — Pinia store
  api/            — API 接口封装
  utils/          — 工具函数
  assets/styles/  — 全局样式
  router/         — 路由配置
```

---

## 五、技术选型

| 领域 | 选择 | 理由 |
|------|------|------|
| 框架 | Vue 3 + Vite | 已搭建 |
| UI | Element Plus | 已引入，生态成熟 |
| 状态管理 | Pinia | 已引入 |
| HTTP | Axios | 已引入 |
| 样式 | SCSS + CSS Variables | 已配置 |
| 图表 | ECharts（建议） | 市场情绪仪表盘需要 |
| 响应式 | Element Plus 内置 + 自定义 media query | |

---

## 六、工作量估算

| 阶段 | 文件数 | 预估工时 |
|------|--------|---------|
| Stage 1 — 三个列表页重写 | ~6 个文件 | 3-4 天 |
| Stage 2 — 详情页 + 首页 | ~5 个文件 | 2-3 天 |
| Stage 3 — 用户系统 + 管理 | ~5 个文件 | 1-2 天 |
| Stage 4 — 运维 + 体验 | ~4 个文件 | 1-2 天 |
| **合计** | **~20 个文件** | **7-11 天** |

## 变更记录

### 2026-07-09 — 可转债配售表「成本」列改造

**需求**：将「每股/配10手」列改为「成本」列，展示获配每手成本。

**改动文件**：
1. `src/stores/convertible.js` — `normalizePendingItem` 中新增：
   - `_sharesPerLotRaw`：理论每股数（sharesFor10 / 10）
   - `_actualSharesFor1Lot`：向上取整到100股整数倍的实际需购买股数
   - `_costPerLotRaw`：获配每手成本
   - return 对象新增：`costPerLot`、`_costPerLotRaw`、`actualSharesFor1Lot`、`_actualSharesFor1Lot`、`sharesPerLotRaw`、`_sharesPerLotRaw`

2. `src/views/Convertible.vue` — 表格列改造：
   - 列标题：「每股/配10手」→「成本」
   - 主显示区：新增「获配每手 xxx元」+「需买入 xxx股（x手）」
   - tooltip 新增「获配每手成本」计算说明区块
   - 保留原有每股、一手党等信息

3. `src/views/Convertible.vue` — 成本列点击弹窗改造：
   - 成本列从 el-tooltip 改为点击弹出 el-dialog
   - 弹窗包含：公式说明 + 当前债券计算过程（含正股价）+ 沪深规则 + 一手党
   - 强调A股最小单位为1手（100股整数）
   - ✅ 2026-07-09 重新设计：弹窗改为上方 el-table（1-5手配售参数）+ 下方 el-collapse（可折叠公式说明），宽度调整为560px

   - ✅ 2026-07-09 新增一手党多档位成功率参考：成本弹窗中新增 50%/60%/70%/80%/100% 档位表格（仅沪市），60% 标记为推荐

4. `docs/specs/convertible-placement-cost-spec.md` — 新建成本列完整规格文档

### 2026-07-09 — LOF 数据源切换：新浪 → 东方财富

**需求**：LOF 页面数据大幅缺失，后端新浪 API 不提供净值/溢价率。切换到东方财富 push2 API。

**改动文件**：
1. `trading-toolkit-service/cloudrun/services/lof_fund.py` — 完整重写：
   - 数据源从新浪 JSONP 切换到东方财富 push2 API（`b:MK0404` LOF + `b:MK0403` ETF）
   - 字段映射：f161→基金净值、f168→溢价率、f5→成交量、f6→成交额
   - 新增连续溢价快照机制：JSON 文件存储每日溢价状态，保留 30 天
   - 新增申购状态获取：东财基金详情 API，模块级缓存 TTL 1h
   - `get_lof_opportunities()` 改用真实溢价率排序
   - `get_lof_market_summary()` 补充溢价率统计字段
   - ✅ 2026-07-09 完成，Python 语法检查通过，前端编译通过

### 技术债

- **成本计算前端分散**：获配每手成本（`costPerLot`、`actualSharesFor1Lot`）的计算目前在前端完成（web 端 `src/stores/convertible.js` L259-266，小程序端 `miniprogram/pages/convertible/index.js` `formatPendingItem`），建议后续迁移到后端 `convertible_bond.py` 的 `_fetch_em_pending_bonds()` 中统一计算，避免多端维护不一致。
- **小程序端缺失成本字段**：小程序端 `formatPendingItem` 目前未计算 `costPerLot`、`actualSharesFor1Lot`、`sharesPerLotRaw`（与 web 端不一致），待后端统一后可直接透传。
