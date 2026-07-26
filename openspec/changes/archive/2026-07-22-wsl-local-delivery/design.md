# 设计

`scripts/wsl/trading-toolkit` 是唯一的操作入口。它解析 Web 仓库及其相邻的服务仓库、运行检查、记录已部署的 SHA，并控制一个 systemd 用户单元。该单元通过 Vite preview 和 Flask 在 5173 和 8080 端口运行生产构建的 Web 资源。

部署采用故意失败关闭策略：服务检出只能在 `cloudrun/trading_toolkit.db` 处有所不同；所有其他本地修改都会阻止部署。脚本不使用重置、清理或自动远程拉取。
