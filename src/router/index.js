import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'convertible',
        name: 'Convertible',
        component: () => import('@/views/Convertible.vue'),
        meta: { title: '可转债' }
      },
      {
        path: 'convertible/:code',
        name: 'BondDetail',
        component: () => import('@/views/BondDetail.vue'),
        meta: { title: '可转债详情' }
      },
      {
        path: 'lof',
        name: 'Lof',
        component: () => import('@/views/Lof.vue'),
        meta: { title: 'LOF 基金' }
      },
      {
        path: 'lof/:code',
        name: 'LofDetail',
        component: () => import('@/views/LofDetail.vue'),
        meta: { title: 'LOF 套利详情' }
      },
      {
        path: 'closed-end',
        name: 'ClosedEnd',
        component: () => import('@/views/ClosedEnd.vue'),
        meta: { title: '封闭式基金' }
      },
      {
        path: 'hkipo',
        name: 'Hkipo',
        component: () => import('@/views/Hkipo.vue'),
        meta: { title: '港股打新' }
      },
      {
        path: 'hkipo/:code',
        name: 'HkipoDetail',
        component: () => import('@/views/HkipoDetail.vue'),
        meta: { title: '港股打新详情' }
      },
      {
        path: 'favorites',
        name: 'Favorites',
        component: () => import('@/views/Favorites.vue'),
        meta: { title: '自选管理' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '设置' }
      },
      {
        path: 'quote-manage',
        name: 'QuoteManage',
        component: () => import('@/views/QuoteManage.vue'),
        meta: { title: '名言管理' }
      },
      {
        path: 'api-log',
        name: 'ApiLog',
        component: () => import('@/views/ApiLog.vue'),
        meta: { title: '接口日志' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
