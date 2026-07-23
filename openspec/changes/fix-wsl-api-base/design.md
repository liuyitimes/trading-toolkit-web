# Local API Base Design

The WSL workflow keeps browser API requests same-origin (`/api`) and runs Vite's local server with a proxy to `http://127.0.0.1:8080`. This avoids browser-side loopback and cross-port filtering while leaving cloud environment configuration unchanged. The production build remains a CI guard before restart.
