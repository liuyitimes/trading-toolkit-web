import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base =
    mode === 'production' ? env.VITE_BASE_PATH || '/trading-toolkit-web/' : '/'

  return {
    base,
    server: {
      proxy: {
        '/api': {
          target: env.VITE_LOCAL_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true
        }
      }
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
