import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/styles/reset.css'
import './assets/styles/global.scss'

const app = createApp(App)

if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/vue')
    .then(({ init }) => {
      init({
        app,
        dsn: import.meta.env.VITE_SENTRY_DSN,
        tracesSampleRate: 0
      })
    })
    .catch(() => {})
}

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { size: 'default' })
app.mount('#app')
