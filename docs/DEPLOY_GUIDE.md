# Web 交付指南（Cloudflare Pages）

本项目 Demo 阶段以 Cloudflare Pages 托管 Vue 应用，并直接请求 Render 新加坡的 Flask API。中国大陆访问属于尽力而为，不承诺大陆节点、低延迟或 SLA；原因见 Service 仓库的 `docs/research/china-mainland-hosting-options.md`。

## 发布链路

```
PR -> CI（格式 + 契约 + 导出 + 构建 + 浏览器冒烟）
   -> 合并受保护 main
   -> CI 在 main 全绿
   -> Deploy to Cloudflare Pages（串行、不取消）
   -> wrangler pages deploy
   -> 校验生产站点已引用本次构建的哈希入口 + immutable 缓存策略
```

| 工作流                 | 职责                     | 触发                                      |
| ---------------------- | ------------------------ | ----------------------------------------- |
| `ci.yml`               | 质量门禁与构建           | 任意分支 push、指向 main 的 PR            |
| `cloudflare-pages.yml` | 发布、生效校验、发布归档 | CI 在 main 成功后、手动触发（可指定 ref） |
| `deploy.yml`           | GitHub Pages 回退通道    | 仅手动                                    |

## 一次性配置

1. 在 Cloudflare Pages 创建项目 `trading-toolkit-web`，连接 GitHub 仓库。
2. 在 GitHub Actions Secrets 设置：

| Secret                  | 用途                                  |
| ----------------------- | ------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | 具有 Pages 编辑权限的最小权限 Token。 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID。                  |
| `VITE_API_BASE_URL`     | Render 服务的 HTTPS 根地址。          |
| `VITE_SENTRY_DSN`       | 可选；留空则不加载 Sentry。           |

3. 在 Render 的 `CORS_ALLOWED_ORIGINS` 中加入 Cloudflare Pages 正式域名。
4. 在 GitHub 为 `main` 启用 PR 审查及 CI、CodeQL 等必需检查。

缺任一必填 Secret 时发布**显式失败**，不再出现"流水线绿但站点没更新"的假发布。

### 可选：固定服务端契约版本

CI 会从 `liuyitimes/trading-toolkit-service` 读取 `contracts/http-api.json` 做契约校验。默认取该仓库 `main`，上游契约变更会即时影响本仓库 CI。需要可复现时，配置仓库变量 `SERVICE_CONTRACT_REF`（填服务端提交 SHA），跟进契约时再显式更新。

## CI 门禁明细

- `npm ci` 锁定依赖；Prettier 交付边界检查。
- 契约校验：`src/api/` 的路径与方法必须命中服务端端点矩阵。
- `npm run verify:placement-export`：配债导出文档。
- `npm run build`，并断言 `dist/index.html` 已引用哈希化资源。
- **生产构建浏览器冒烟**：用 `vite preview` 提供真实 `dist`，运行 `verify:market-browser` 与 `verify:lof-market-overview`。
- **源码级用例**：`verify:placement-browser` 会动态 `import('/src/stores/convertible.js')`，该路径仅 dev server 提供，因此在独立步骤以 dev server 运行，作用域是状态逻辑而非部署产物。

上一版 CI 直接用 dev server 跑全部浏览器用例，导致部署产物本身没有浏览器覆盖；现已分离，两段各有独立的就绪等待与失败日志（失败时上传 `web-ci-diagnostics-<run_id>` 工件）。

## 本地验证

```bash
npm ci
npm run format:check:delivery
SERVICE_CONTRACT_PATH=../trading-toolkit-service/contracts/http-api.json npm run verify:contract
npm run verify:placement-export
npm run build
```

浏览器验证：生产构建与源码级用例分开跑。

```bash
# 生产构建冒烟
npm run preview -- --host 127.0.0.1 --port 5175
WEB_URL=http://127.0.0.1:5175 npm run verify:market-browser
WEB_URL=http://127.0.0.1:5175 npm run verify:lof-market-overview

# 源码级配债用例（需要 dev server）
npm run dev -- --host 127.0.0.1 --port 5176
WEB_URL=http://127.0.0.1:5176 npm run verify:placement-browser
```

> WSL 本地交付不受影响：受管服务仍按 [WSL 本地交付](wsl-local-delivery.md) 使用 `scripts/wsl/trading-toolkit deploy`，以 `vite preview` 提供已验证的生产构建。本仓库的 CI 运行在 GitHub 的 Ubuntu runner 上，与本地 WSL 环境彼此独立。

## 发布后检查

1. 打开 Cloudflare Pages 正式地址，确认市场首页与配债页面可加载。
2. 用浏览器网络面板确认请求只发往配置的 `VITE_API_BASE_URL`。
3. 确认 API 响应没有 CORS 报错；若有，核对 Render 的 `CORS_ALLOWED_ORIGINS`。
4. 若配置 Sentry，制造一次受控前端异常并确认事件不包含用户输入、完整请求正文或令牌。

流水线已自动完成其中第 1 步的机器化等价校验：生产页面必须引用**本次构建独有的** `/assets/index-<hash>.js`，且该资源返回 `Cache-Control: immutable`。仅判断"页面里有 `/assets/`"已不足以证明发布生效。

## 回滚

### 自动（未生效即失败）

发布后未在 300 秒内观察到新哈希入口，流水线判定发布未生效并失败，不会把旧版本当成成功。

### 人工

1. **回滚到上一个可用提交**：手动触发 `Deploy to Cloudflare Pages`，在 `ref` 输入框填上一个可用提交 SHA。流水线重新构建该提交并发布，再用该构建的哈希入口验证生效。
2. **仅回滚静态资源**：Cloudflare Dashboard → Pages → 项目 → Deployments → 选中上一个成功部署 → Rollback。
3. 回滚后核对 `/assets/` 的 `Cache-Control` 仍为 `immutable`。

每次发布产出 `web-release-record-<run_id>` 工件，含提交 SHA、入口资源名、部署地址、触发方式、结果与时间戳。
