# Trading Toolkit Web

Trading Toolkit 的 Vue Web 应用，用于查看可转债、LOF 基金、港股 IPO、封闭式基金和市场概览。它通过独立的 Flask 服务 `trading-toolkit-service` 读取数据。

开发说明见 [docs/development.md](docs/development.md)。接口字段遵循后端仓库的 `docs/DATA_GUIDE.md`；本仓库负责将后端 `snake_case` 字段归一化为页面使用的 `camelCase` 字段。

## 启动

```bash
npm install
npm run dev
```

默认 API 地址由 `.env.development` 中的 `VITE_API_BASE_URL` 配置，服务端本地默认地址为 `http://localhost:8080`。

## 常用命令

| 命令                   | 用途                   |
| ---------------------- | ---------------------- |
| `npm run dev`          | 启动 Vite 开发服务器。 |
| `npm run build`        | 构建生产静态文件。     |
| `npm run preview`      | 本地预览构建产物。     |
| `npm run format:check` | 检查 Prettier 格式。   |

## 目录

| 路径              | 职责                             |
| ----------------- | -------------------------------- |
| `src/api/`        | HTTP API 封装与响应解包。        |
| `src/stores/`     | 请求编排、状态管理和字段归一化。 |
| `src/views/`      | 页面级展示与用户交互。           |
| `src/components/` | 可复用界面组件。                 |
| `src/utils/`      | 无界面依赖的格式化、导出等工具。 |
| `docs/`           | 开发、设计决策与验证记录。       |

## 命名约定

- 后端接口字段：`snake_case`，例如 `stock_code`。
- Web 领域字段：`camelCase`，例如 `stockCode`。
- 公式和排序所需的原始数值：`_xxxRaw`，例如 `_stockPriceRaw`。
- `/api/v1/convertible/pending` 的返回项统一称为“待发配债候选标的”。
- `placement_provenance` 统一称为“配债来源信息”，Web 字段名为 `placementProvenance`。

本工具仅供学习研究，不构成投资建议。
