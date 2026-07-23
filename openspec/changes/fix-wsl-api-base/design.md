# Local API Base Design

Only the WSL deploy build command receives `VITE_API_BASE_URL=http://127.0.0.1:8080`. The committed production environment remains unchanged for cloud deployments. The preview server serves already-built assets, so no preview-time environment override is needed.
