# Design

`scripts/wsl/trading-toolkit` is the single operator entry point. It resolves the Web repository and its sibling service repository, runs checks, records the deployed SHAs, and controls a systemd user unit. The unit runs production-built Web assets through Vite preview and Flask on ports 5173 and 8080.

Deployment is deliberately fail-closed: the service checkout may only differ at `cloudrun/trading_toolkit.db`; all other local modifications stop deployment. The script does not use reset, clean, or an automatic remote pull.
