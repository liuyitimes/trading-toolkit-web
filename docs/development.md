# Web 开发指南

> 最后更新：2026-07-24

本仓库是 Trading Toolkit 的 Vue 3 Web 应用。它不实现市场数据抓取；数据由独立仓库 `trading-toolkit-service` 的 Flask API 提供。

## 启动与构建

```bash
npm install
npm run dev
npm run build
```

`.env.development` 中的 `VITE_API_BASE_URL` 是服务地址，本地默认值为 `http://localhost:8080`。生产环境使用 `.env.production`，不得把地址硬编码到页面或组件中。

## 代码分层

```text
View / Component
  -> Store 或领域应用服务
  -> API 模块
  -> Flask 服务
```

| 层         | 位置                            | 负责什么                                                   |
| ---------- | ------------------------------- | ---------------------------------------------------------- |
| 视图       | `src/views/`、`src/components/` | 展示状态、响应用户操作；不直接请求 API，也不承载领域计算。 |
| 状态与编排 | `src/stores/`                   | 发起读取、管理加载和失败状态、归一化数据、协调跨模块流程。 |
| HTTP 访问  | `src/api/`                      | 每个领域一个 API 对象，统一使用 Axios 实例。               |
| 纯工具     | `src/utils/`                    | 格式化、导出等无 Vue、Pinia、Axios 依赖的逻辑。            |

`src/api/index.js` 负责解包后端成功信封 `{ success, data, meta }`，因此 Store 接收到的是内层业务数据，而不是完整 Axios 响应。

## API 模块

| 模块             | 服务端路径前缀        | 示例导出                                  |
| ---------------- | --------------------- | ----------------------------------------- |
| `market.js`      | `/api/v1/market`      | `marketApi`                               |
| `convertible.js` | `/api/v1/convertible` | `convertibleApi`                          |
| `lof.js`         | `/api/v1/lof`         | `lofApi`                                  |
| `hkipo.js`       | `/api/v1/hkipo`       | `hkipoApi`                                |
| `closedEnd.js`   | `/api/v1/closed-end`  | `closedEndApi`                            |
| `user.js`        | `/api/v1/user`        | `userApi`（当前页面未使用，保留为兼容层） |

服务端路由、请求方法和字段语义以 `trading-toolkit-service/docs/DATA_GUIDE.md` 与该仓库的 OpenSpec 基线为准。新增 API 方法前，先确认服务端路由已实现；客户端方法名不是服务能力的证明。

## 字段命名

字段在不同层有明确边界：

| 层             | 约定               | 示例                                 |
| -------------- | ------------------ | ------------------------------------ |
| HTTP 响应      | `snake_case`       | `stock_code`、`per_share_allocation` |
| Store 领域模型 | `camelCase`        | `stockCode`、`perShare`              |
| 原始数值       | `_xxxRaw`          | `_stockPriceRaw`、`_safetyPadRaw`    |
| 展示值         | 语义化 `camelCase` | `stockPrice`、`safetyPad`            |

- 展示值可以带单位，例如 `"129.93元"` 或 `"5.20%"`；计算、排序和导出公式必须使用对应的原始数值。
- 无数值时列表统一显示 `--`，详情文本统一显示“暂无”；来源字段缺失统一显示“不可用”。
- 待发配债 API 的单项统一称为“待发配债候选标的”。
- `cash_ratio` / `cashRatio` 表示百元含权；`stock_cash_ratio` 不是它的别名。
- `placement_provenance` / `placementProvenance` 统一称为“配债来源信息”。不得读取 `placement_evidence` 或裸 `provenance` 作为替代字段。

## 可转债配债数据流

```text
GET /api/v1/convertible/pending
  -> 后端候选标的字段（snake_case）
  -> normalizePendingItem()
  -> Web 候选标的字段（camelCase 和 _xxxRaw）
  -> 配债表格、详情和 Markdown 导出
```

`placement_provenance` 是可选字段。服务未提供时，页面和导出必须保持可用并明确标出来源信息“不可用”，不能根据行情、旧记录或其他字段推断。

## 验证

```bash
npm run format:check
npm run build
node tests/placement-export.mjs
```

涉及页面交互时，还应运行与改动模块对应的浏览器验证脚本。修改前端行为前，先阅读 `openspec/README.md` 和相应基线规格。
