# 新手部署指南

> 本指南将一步步教你如何启用 GitHub Actions 自动构建 + GitHub Pages 自动部署。无需任何服务器，完全免费！

## 📋 前置条件

1. 有一个 GitHub 账号（没有的话去 https://github.com 注册）
2. 本地已安装 Node.js（版本 18 或以上）
3. 已将代码推送到 GitHub 仓库

---

## 🚀 第一步：在 GitHub 仓库启用 Pages（使用 GitHub Actions）

> **重要**：根据 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)，配置步骤如下：

### 1.1 打开仓库设置页面

1. 登录 GitHub，进入你的仓库页面（例如 `https://github.com/amostodo/trading-toolkit-web`）
2. 在仓库名称下方，点击 **Settings** 选项卡
   - 如果看不到 "Settings" 标签，点击下拉菜单，然后选择 **Settings**

### 1.2 找到 Pages 设置

1. 在左侧边栏的 **"Code and automation"** 区域
2. 点击 **Pages**

### 1.3 配置 Source 为 GitHub Actions

在 **"Build and deployment"** 区域：

1. 在 **"Source"** 下拉框中，选择 **GitHub Actions**
2. GitHub 会建议一些工作流模板
   - **因为我们已经准备好了工作流文件，可以跳过这一步**
   - 如果提示选择模板，直接忽略即可

> **注意**：GitHub Pages 不会关联特定的工作流到设置中，但设置页面会链接到最近部署你站点的工作流运行。

---

## 🔧 第二步：确认工作流文件已存在

你的仓库应该已经包含以下文件（`.github/workflows/` 目录下）：

```
.github/
  workflows/
    ci.yml        ← 构建校验工作流
    deploy.yml    ← 自动部署工作流
```

### 工作流说明

| 文件 | 作用 | 触发条件 |
|------|------|----------|
| `ci.yml` | 每次提交代码自动检查是否能构建成功 | push 到任意分支、PR |
| `deploy.yml` | 自动构建并发布到 GitHub Pages | push 到 `main` 分支 |

> **工作流流程**（根据官方文档）：
> 1. 当有 push 到默认分支时触发
> 2. 使用 `actions/checkout` 检出仓库内容
> 3. 构建静态站点文件（如果需要）
> 4. 使用 `actions/upload-pages-artifact` 上传静态文件作为 artifact
> 5. 使用 `actions/deploy-pages` 部署 artifact

> **注意**：工作流模板使用名为 `github-pages` 的部署环境。如果你的仓库还没有这个环境，会自动创建。

---

## 📤 第三步：推送代码触发自动部署

### 3.1 确认当前分支是 main

```bash
# 查看当前分支
git branch

# 如果不在 main 分支，切换到 main
git checkout main
```

### 3.2 推送代码到 GitHub

```bash
# 添加所有修改的文件
git add .

# 提交修改
git commit -m "启用 GitHub Pages 自动部署"

# 推送到 GitHub
git push origin main
```

推送后，GitHub Actions 会自动开始运行！

---

## 👀 第四步：查看部署状态

### 4.1 进入 Actions 页面

1. 回到 GitHub 仓库页面
2. 点击顶部的 **Actions** 选项卡
3. 你会看到正在运行的工作流（黄色圆圈表示正在运行）

![Actions 页面](https://docs.github.com/assets/cb-53485/mw-1440/images/help/repository/actions-tab.webp)

### 4.2 查看部署详情

点击正在运行的工作流名称（例如 "Deploy to GitHub Pages"），可以看到：

- 当前执行到哪一步
- 每一步的日志输出
- 是否有错误（红色 × 表示失败，绿色 ✓ 表示成功）

### 4.3 等待部署完成

通常需要 1-3 分钟，当所有步骤都显示绿色 ✓ 时，部署成功！

---

## 🌐 第五步：访问你的网站

### 5.1 获取访问地址

部署成功后，有两种方式获取访问地址：

**方式一：从 Actions 日志获取**

1. 在 Actions 页面，点击成功的工作流
2. 找到 "Deploy to GitHub Pages" 步骤
3. 日志中会显示访问地址，类似：
   ```
   https://你的用户名.github.io/trading-toolkit-web/
   ```

**方式二：从 Pages 设置获取**

1. 进入 Settings → Pages
2. 页面顶部会显示访问地址（可能需要等待 1-2 分钟才更新）

### 5.2 打开网站

在浏览器中输入访问地址，你应该能看到你的网站！

> ⚠️ 注意：首次部署可能需要等待 1-2 分钟才能访问，这是因为 GitHub 需要初始化 Pages 服务。

---

## 🔄 后续更新流程

以后每次你修改代码并推送到 `main` 分支，GitHub Actions 会自动：

1. 检查代码能否构建成功（`ci.yml`）
2. 自动构建并部署新版本（`deploy.yml`）

你不需要手动做任何事情！

```bash
# 日常更新流程（三步）
git add .                          # 添加修改
git commit -m "更新说明"            # 提交修改
git push origin main               # 推送到 GitHub，自动触发部署
```

---

## 🛠️ 环境变量配置（可选）

如果你的后端 API 地址需要修改，可以在 GitHub 仓库中配置环境变量：

### 方式一：修改 `.env.production` 文件

编辑仓库中的 `.env.production` 文件：

```env
VITE_API_BASE_URL=https://你的后端地址
```

### 方式二：在 GitHub Secrets 中配置

1. 进入 Settings → Secrets and variables → Actions
2. 点击 **New repository variable**
3. Name: `VITE_API_BASE_URL`
4. Value: 你的后端地址（例如 `https://your-backend.vercel.app`）

---

## ❓ 常见问题排查

### 问题 1：访问网站显示 404

**原因**：部署未成功或 Pages 未启用

**解决**：
1. 检查 Actions 页面，确认部署工作流是否成功（绿色 ✓）
2. 检查 Settings → Pages，确认 Source 是 "GitHub Actions"
3. 等待 1-2 分钟再访问

> **官方文档提示**：
> - 如果你的站点没有自动发布，确保有 admin 权限且已验证邮箱的用户已推送到发布源
> - 使用 `GITHUB_TOKEN` 的 GitHub Actions 工作流推送的提交不会触发 GitHub Pages 构建

### 问题 2：Actions 显示失败（红色 ×）

**原因**：构建过程中有错误

**解决**：
1. 点击失败的工作流，查看日志
2. 找到失败的步骤，查看错误信息
3. 根据错误提示修改代码，重新推送

常见构建错误：
- `npm install` 失败：检查 `package.json` 是否有语法错误
- `npm run build` 失败：检查代码是否有语法错误

### 问题 3：网站样式加载失败

**原因**：资源路径配置错误

**解决**：
检查 `vite.config.js` 中的 `base` 配置，生产模式下应该是：
```js
base: '/trading-toolkit-web/'  // 或你的仓库名
```

### 问题 4：每次推送都触发两个工作流

**原因**：`ci.yml` 和 `deploy.yml` 都在 `main` 分支触发

**解决**：这是正常的！
- `ci.yml`：只做构建检查，不部署
- `deploy.yml`：构建 + 部署

两个工作流并行运行，互不影响。

---

## 📞 需要帮助？

如果遇到问题：

1. 先查看 Actions 页面的日志，大部分错误都有详细提示
2. 检查本文档的「常见问题排查」部分
3. 查看官方文档：[Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
4. 如果还是解决不了，可以：
   - 在 GitHub Issues 中提问
   - 搜索错误信息（复制日志中的错误信息到 Google 搜索）

---

## 🎉 总结

启用自动部署只需要三步：

1. **Settings → Pages → Source 改为 GitHub Actions**
2. **推送代码到 main 分支**
3. **等待 Actions 运行完成，访问网站**

以后每次修改代码，推送到 GitHub 就会自动部署，无需手动操作！