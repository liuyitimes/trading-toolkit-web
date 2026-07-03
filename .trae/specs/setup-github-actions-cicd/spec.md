# GitHub Actions 自动化 CI/CD Spec

## Why
当前项目（trading-toolkit-web 前端 + trading-toolkit 后端）没有任何 CI/CD 配置，每次代码合并与部署都需要本地手动构建并自行上传，效率低且容易出错。本变更旨在引入零成本的自动构建与发布方案：
- **前端**（trading-toolkit-web）：CI（构建校验）+ CD（GitHub Pages 自动部署，稳定可靠）
- **后端**（trading-toolkit）：CI（依赖安装 + 导入校验 + 测试脚本执行），部署仍由现有的微信云函数流程负责（国内访问极快，免费额度充足）

使 `main` 分支的每次提交都能自动构建并发布，每次 PR/push 都能自动校验构建是否通过。

## What Changes

### 前端仓库（trading-toolkit-web）
- 新增 `.github/workflows/ci.yml`：在 push / pull_request 时执行依赖安装与 `npm run build`，确保代码可构建通过。
- 新增 `.github/workflows/deploy.yml`：在 `main` 分支 push 时执行生产构建并发布到 GitHub Pages。
- 修改 `vite.config.js`：为生产构建动态设置 `base`（默认适配 `<owner>.github.io/<repo>/` 子路径，避免资源 404），保留开发模式 `base: '/'`。
- 在 `README.md` 追加「自动化 CI/CD 与 GitHub Pages 部署说明」小节。

### 后端仓库（trading-toolkit）
- 新增 `.github/workflows/backend-ci.yml`：在 push / pull_request 时安装 cloudrun 依赖（使用 pip 清华镜像加速）并执行 `cloudrun/scripts/test_api_logs.py` 测试脚本，确保后端可正常导入与运行。
- 后端部署不在本次范围（继续由微信云函数/CloudBase 云托管负责，国内访问快）。

> 说明：本项目为前后端分离架构，后端已独立部署在微信云开发（见 `trading-toolkit/docs/deployment.md`）。本次 CI/CD 仅覆盖「自动构建校验」与「前端自动部署」，不改变后端部署方式。

## Impact
- Affected specs: 无（首个 CI/CD 相关 spec）
- Affected code:
  - **前端仓库**：
    - `vite.config.js`（修改 `base` 配置）
    - `.github/workflows/ci.yml`（新增）
    - `.github/workflows/deploy.yml`（新增）
    - `README.md`（追加部署说明）
  - **后端仓库**（`d:\Develop\GitHub\trading-toolkit`）：
    - `.github/workflows/backend-ci.yml`（新增）
- 外部依赖：
  - 前端仓库需在 GitHub Pages 设置中将 Source 切换为 "GitHub Actions"。
  - 后端无外部依赖变更。
- 资源成本：GitHub Actions 与 Pages 均完全免费；公开仓库无额度压力。后端依赖较重（akshare ~30MB + pandas + numpy），CI 单次约 3-5 分钟。

## ADDED Requirements

### Requirement: 前端 CI 构建校验
系统 SHALL 在每次 push 到任意分支、以及针对 `main` 的 pull_request 时，自动触发 GitHub Actions 工作流，安装依赖并执行 `npm run build`，用于尽早发现构建失败。

#### Scenario: push 触发 CI
- **WHEN** 开发者 push 到任意分支
- **THEN** CI 工作流自动运行 `npm install`（淘宝镜像）+ `npm run build`
- **AND** 在 GitHub 仓库 Actions 页面可查看运行状态与日志

#### Scenario: PR 触发 CI
- **WHEN** 针对 `main` 开启 pull_request
- **THEN** CI 工作流自动运行构建校验
- **AND** PR 检查列表显示该工作流状态

### Requirement: 前端自动部署到 GitHub Pages
系统 SHALL 在 push 到 `main` 分支时，自动触发部署工作流：执行生产构建（使用 `.env.production`）并将 `dist/` 产物发布到 GitHub Pages。

#### Scenario: 主分支推送触发部署
- **WHEN** push 到 `main` 分支
- **THEN** 部署工作流执行 `npm run build`
- **AND** 将 `dist/` 通过 `actions/upload-pages-artifact` + `actions/deploy-pages` 发布到 GitHub Pages
- **AND** 站点访问地址为 `https://<owner>.github.io/<repo>/`

#### Scenario: 资源路径正确
- **WHEN** GitHub Pages 站点在子路径 `<repo>/` 下加载
- **THEN** `vite.config.js` 的 `base` 在生产构建中设置为 `/<repo>/`（或通过环境变量 `VITE_BASE_PATH` 覆盖），确保 JS/CSS/图片等资源路径正确，无 404

### Requirement: 后端 CI 构建校验
系统 SHALL 在后端仓库（trading-toolkit）的每次 push / pull_request 时，自动触发 GitHub Actions 工作流，安装 cloudrun 依赖并执行测试脚本，用于尽早发现依赖冲突与导入错误。

#### Scenario: 后端 push 触发 CI
- **WHEN** 开发者 push 到后端仓库任意分支
- **THEN** CI 工作流自动运行 `pip install -r cloudrun/requirements.txt`（清华镜像）+ `python cloudrun/scripts/test_api_logs.py`
- **AND** 在 GitHub 仓库 Actions 页面可查看运行状态与日志

#### Scenario: 后端 PR 触发 CI
- **WHEN** 针对后端仓库 `main` 开启 pull_request
- **THEN** CI 工作流自动运行依赖安装与测试
- **AND** PR 检查列表显示该工作流状态

### Requirement: 构建环境加速
系统 SHALL 在所有 CI 工作流中使用国内镜像源加速依赖安装：
- 前端：npm 淘宝镜像（`https://registry.npmmirror.com`）+ `actions/cache` 缓存 `~/.npm`
- 后端：pip 清华镜像（`https://pypi.tuna.tsinghua.edu.cn/simple`）+ `actions/cache` 缓存 pip 下载目录

#### Scenario: 镜像与缓存生效
- **WHEN** 任意 CI 工作流运行
- **THEN** 前端在 `npm install` 前切换至淘宝镜像
- **AND** 后端在 `pip install` 时通过 `-i` 参数使用清华镜像
- **AND** 通过 `actions/cache` 缓存对应包管理器目录，二次运行命中缓存

## MODIFIED Requirements
（无已有相关 requirement 需要修改）

## REMOVED Requirements
（无移除项）
