# Trading Toolkit Web

Vue 3 + Vite 前端项目，提供可转债、LOF 基金、港股 IPO 等投资工具。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 自动化 CI/CD

### 前端部署

项目使用 **GitHub Pages** 自动部署，稳定可靠。

**👉 新手请看详细教程：[部署指南](docs/DEPLOY_GUIDE.md)**

#### 快速步骤

1. 访问 GitHub 仓库 → **Settings** → **Pages**
2. 在 **Build and deployment** 下，将 **Source** 设置为 **GitHub Actions**
3. 推送代码到 `main` 分支，GitHub Actions 自动构建并部署

#### 访问地址

- 默认: `https://<username>.github.io/trading-toolkit-web/`
- 自定义域名: 在 Pages 设置中配置

#### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_BASE_PATH` | 生产环境 base 路径 | `/trading-toolkit-web/` |
| `VITE_API_BASE_URL` | 后端 API 地址 | `https://your-flask-backend.vercel.app` |

### 后端 CI

后端仓库（`trading-toolkit`）使用 GitHub Actions 自动执行依赖安装和测试，确保代码可正常运行。部署仍由微信云函数负责。

### 工作流文件

- `.github/workflows/ci.yml`: 构建校验（所有分支 push / PR）
- `.github/workflows/deploy.yml`: 自动部署到 GitHub Pages（main 分支）
