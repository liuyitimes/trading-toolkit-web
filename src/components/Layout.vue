<template>
  <el-container class="layout-container">
    <el-aside :width="asideWidth" class="layout-aside">
      <div class="logo" @click="router.push('/home')">
        <el-icon :size="28"><Coin /></el-icon>
        <span v-show="!isCollapse" class="logo-text">旺财百宝箱</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="transparent"
        text-color="var(--sidebar-text)"
        active-text-color="var(--sidebar-active-text)"
        router
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <el-menu-item index="/convertible">
          <el-icon><TrendCharts /></el-icon>
          <template #title>可转债</template>
        </el-menu-item>
        <el-menu-item index="/lof">
          <el-icon><Money /></el-icon>
          <template #title>LOF 基金</template>
        </el-menu-item>
        <el-menu-item index="/closed-end">
          <el-icon><Lock /></el-icon>
          <template #title>封闭式基金</template>
        </el-menu-item>
        <el-menu-item index="/hkipo">
          <el-icon><Ship /></el-icon>
          <template #title>港股打新</template>
        </el-menu-item>
        <el-menu-item index="/favorites">
          <el-icon><StarFilled /></el-icon>
          <template #title>自选管理</template>
        </el-menu-item>
        <el-menu-item index="/quote-manage">
          <el-icon><ChatLineRound /></el-icon>
          <template #title>名言管理</template>
        </el-menu-item>
        <el-menu-item index="/api-log">
          <el-icon><Document /></el-icon>
          <template #title>接口日志</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon :size="20" class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb>
            <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span v-if="appStore.lastUpdated" class="header-update">
            更新于 <TimeStamp :time="appStore.lastUpdated" :stale-after="60" />
          </span>
          <el-tooltip :content="appStore.isDarkMode ? '切换明亮' : '切换暗黑'" placement="bottom">
            <el-icon :size="20" class="header-action" @click="appStore.toggleDarkMode()">
              <Moon v-if="!appStore.isDarkMode" />
              <Sunny v-else />
            </el-icon>
          </el-tooltip>
        </div>
      </el-header>

      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>

  <!-- 全局悬浮工具栏 -->
  <FloatToolbar />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useFloatingStore } from '@/stores/floating'
import { HomeFilled, TrendCharts, Money, Ship, StarFilled, Setting, Fold, Expand, Moon, Sunny, Coin, ChatLineRound, Document, Lock } from '@element-plus/icons-vue'
import FloatToolbar from '@/components/floating/FloatToolbar.vue'
import TimeStamp from '@/components/TimeStamp.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const floatStore = useFloatingStore()
const isCollapse = ref(false)
const isMobile = ref(false)
const asideWidth = computed(() => {
  if (isMobile.value && isCollapse.value) return '0px'
  return isCollapse.value ? '64px' : '220px'
})

let mobileQuery
function updateMobileLayout(event) {
  isMobile.value = event.matches
  if (isMobile.value) isCollapse.value = true
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 768px)')
  updateMobileLayout(mobileQuery)
  mobileQuery.addEventListener('change', updateMobileLayout)
})

onUnmounted(() => {
  mobileQuery?.removeEventListener('change', updateMobileLayout)
})

// 路由切换时自动绑定当前策略
const strategyMap = {
  '/lof': 'LOF 基金套利',
  '/convertible': '可转债',
  '/hkipo': '港股打新',
  '/closed-end': '封闭式基金折价套利'
}
watch(() => route.path, (path) => {
  for (const [prefix, name] of Object.entries(strategyMap)) {
    if (path.startsWith(prefix)) {
      floatStore.setStrategy(name)
      return
    }
  }
  floatStore.setStrategy('')
}, { immediate: true })
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: var(--sidebar-bg);
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.3s;
}

.logo {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  cursor: pointer;

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    white-space: nowrap;
  }
}

.layout-header {
  height: $header-height;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .collapse-btn {
    cursor: pointer;
    color: var(--text-color);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .header-update {
      font-size: 12px;
      color: var(--text-color-secondary);
    }

    .header-action {
      cursor: pointer;
      color: var(--text-color);
    }
  }
}

.layout-main {
  background-color: var(--bg-color);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .layout-aside {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1001;
    height: 100vh;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.16);
  }

  .layout-header {
    padding: 0 12px;

    .header-left {
      gap: 10px;
    }

    .header-update {
      display: none;
    }
  }
}
</style>
