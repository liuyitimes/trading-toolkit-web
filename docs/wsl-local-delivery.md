# WSL Local Delivery

Run these commands in WSL Ubuntu from the Web checkout:

```bash
chmod +x scripts/wsl/trading-toolkit scripts/wsl/run-services
scripts/wsl/trading-toolkit install
scripts/wsl/trading-toolkit deploy
```

The deploy command installs locked Web dependencies, builds `dist`, restarts the user service, and checks Web (`5173`) and service (`8080`) reachability. It never performs a Git pull or destructive Git command. Update each checkout explicitly before deployment.

`cloudrun/trading_toolkit.db` is permitted as a local service change. Any other tracked service modification blocks deployment.

```bash
scripts/wsl/trading-toolkit status
scripts/wsl/trading-toolkit logs 200
scripts/wsl/trading-toolkit health
```
