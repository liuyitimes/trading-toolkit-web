# Checklist

## 前端（trading-toolkit-web）

- [x] `vite.config.js` 在生产模式下根据 `VITE_BASE_PATH` 或仓库名设置 `base`，开发模式保持 `/`
- [x] 本地执行 `npm run build` 后 `dist/index.html` 中资源引用路径正确（含 base 前缀，无绝对根路径导致 404）
- [x] `.github/workflows/ci.yml` 存在，触发条件包含 push 与 pull_request
- [x] 前端 CI 工作流使用 Node 20，配置 npm 淘宝镜像并缓存 `~/.npm`
- [x] 前端 CI 工作流执行 `npm install` 与 `npm run build`
- [x] `.github/workflows/deploy.yml` 存在，仅在 push 到 `main` 时触发
- [x] 前端部署工作流依次调用 configure-pages → upload-pages-artifact → deploy-pages
- [x] 前端部署工作流执行 `npm run build` 后上传 `dist/`
- [x] `dist/` 仍被 `.gitignore` 忽略，构建产物不入库
- [x] `README.md` 包含「自动化 CI/CD」小节，说明 GitHub Pages 配置步骤与访问地址

## 后端（trading-toolkit）

- [x] `trading-toolkit/.github/workflows/backend-ci.yml` 存在，触发条件包含 push 与 pull_request
- [x] 后端 CI 工作流使用 Python 3.11，配置 pip 清华镜像并缓存 pip 目录
- [x] 后端 CI 工作流执行 `pip install -r cloudrun/requirements.txt`
- [x] 后端 CI 工作流执行 `python cloudrun/scripts/test_api_logs.py`
- [x] 后端 CI 工作流设置 `USE_MOCK=true` 环境变量避免调用真实数据源

## 通用

- [x] 所有工作流 YAML 语法正确（可用 `npx yaml-lint` 或在线校验）
- [x] 所有工作流均使用国内镜像源加速依赖安装
- [x] 后端 CI 工作流文件位于后端仓库（`d:\Develop\GitHub\trading-toolkit\.github\workflows\`），不在前端仓库
