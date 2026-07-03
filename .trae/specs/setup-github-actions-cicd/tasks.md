# Tasks

## 前端仓库（trading-toolkit-web）

- [x] Task 1: 调整 `vite.config.js` 支持生产环境 `base` 路径
  - [x] SubTask 1.1: 读取并理解现有 `vite.config.js`
  - [x] SubTask 1.2: 在生产构建（`mode === 'production'`）时根据环境变量 `VITE_BASE_PATH` 或仓库名推断 `base`，默认开发环境保持 `/`
  - [x] SubTask 1.3: 本地执行 `npm run build` 验证产物 `index.html` 中资源路径包含正确的 base

- [x] Task 2: 新增前端 CI 工作流 `.github/workflows/ci.yml`
  - [x] SubTask 2.1: 触发条件为 `push`（任意分支）与 `pull_request`（针对 main）
  - [x] SubTask 2.2: 使用 `actions/checkout@v4`、`actions/setup-node@v4`（node 20）
  - [x] SubTask 2.3: 配置 npm 淘宝镜像并缓存 `~/.npm`
  - [x] SubTask 2.4: 执行 `npm install` 与 `npm run build`

- [x] Task 3: 新增前端部署工作流 `.github/workflows/deploy.yml`
  - [x] SubTask 3.1: 触发条件为 push 到 `main` 分支
  - [x] SubTask 3.2: 使用 `cloudflare/pages-action` 发布到 Cloudflare Pages
  - [x] SubTask 3.3: 声明需要 `CF_API_TOKEN` 和 `CF_ACCOUNT_ID` 两个 GitHub Secrets
  - [x] SubTask 3.4: 执行 `npm run build` 后上传 `dist/`

- [x] Task 4: 更新前端 `README.md` 记录启用步骤
  - [x] SubTask 4.1: 在 README 追加「自动化 CI/CD」小节
  - [x] SubTask 4.2: 写明 Cloudflare Pages 配置步骤、`CF_API_TOKEN` 和 `CF_ACCOUNT_ID` 获取方式、访问地址、可选 `VITE_BASE_PATH` 环境变量说明

## 后端仓库（trading-toolkit）

- [x] Task 5: 新增后端 CI 工作流 `d:\Develop\GitHub\trading-toolkit\.github\workflows\backend-ci.yml`
  - [x] SubTask 5.1: 触发条件为 `push`（任意分支）与 `pull_request`（针对 main）
  - [x] SubTask 5.2: 使用 `actions/checkout@v4`、`actions/setup-python@v5`（python 3.11）
  - [x] SubTask 5.3: 配置 pip 清华镜像并缓存 pip 下载目录（`~/.cache/pip`）
  - [x] SubTask 5.4: 执行 `pip install -r cloudrun/requirements.txt`
  - [x] SubTask 5.5: 执行 `python cloudrun/scripts/test_api_logs.py` 验证后端可正常导入与运行
  - [x] SubTask 5.6: 设置 `USE_MOCK=true` 环境变量避免 CI 中调用真实数据源

## 验证

- [x] Task 6: 本地验证前端工作流 YAML 语法与构建
  - [x] SubTask 6.1: 本地执行 `npm run build` 确认产物路径正确
  - [x] SubTask 6.2: 校验 `.github/workflows/*.yml` 语法（可用 `npx yaml-lint`）

# Task Dependencies
- 前端 Task 3 依赖 Task 1（生产 base 必须先正确，部署后资源才能加载）
- 前端 Task 2 与 Task 3 的工作流文件互不依赖，可并行编写
- 前端 Task 4 为文档，可在前述任务完成后补充
- 后端 Task 5 与前端任务完全独立，可并行
- Task 6 在前端所有任务完成后进行
