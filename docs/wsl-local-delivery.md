# WSL 本地交付

在 Web 仓库的 WSL Ubuntu 环境中执行：

```bash
chmod +x scripts/wsl/trading-toolkit scripts/wsl/run-services
scripts/wsl/trading-toolkit install
scripts/wsl/trading-toolkit deploy
```

`deploy` 会安装锁定的 Web 依赖，以根路径构建 `dist`，执行服务端 API 日志测试与全部服务/回测测试，随后重启用户服务并检查 Web（`5173`）和服务端（`8080`）可达性。受管服务使用 `vite preview` 提供已验证的生产构建，而不是开发服务器。该命令不会执行 Git 拉取或破坏性 Git 操作；请先显式更新两个仓库。可在本机通过 `http://127.0.0.1:5173/convertible` 打开应用。

没有域名时，同一局域网的设备可使用 WSL 主机可达 IP 和端口 `5173`，例如 `http://192.168.1.10:5173/convertible`。浏览器请求保持为同源 `/api`，由预览服务器转发到本地 Flask 服务，因此不会把访问设备自身的 `127.0.0.1` 固化进构建产物。

`cloudrun/trading_toolkit.db` 可以作为本地服务改动保留；其他已跟踪的服务端改动都会阻止部署。

```bash
scripts/wsl/trading-toolkit status
scripts/wsl/trading-toolkit logs 200
scripts/wsl/trading-toolkit health
```
