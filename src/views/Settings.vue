<template>
  <div class="page-container">
    <div class="page-header">
      <h2>设置</h2>
    </div>

    <!-- 外观设置 -->
    <el-card shadow="hover">
      <template #header>
        <div class="section-header">
          <el-icon><Brush /></el-icon>
          <span>外观</span>
        </div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="暗黑模式">
          <el-switch
            :model-value="appStore.isDarkMode"
            @change="appStore.toggleDarkMode()"
            active-text="开启"
            inactive-text="关闭"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 服务配置 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="section-header">
          <el-icon><SetUp /></el-icon>
          <span>服务配置</span>
        </div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="云托管地址" :error="urlError">
          <el-input
            v-model="cloudRunUrlInput"
            placeholder="请输入云托管服务地址"
            clearable
            style="max-width: 480px"
          />
          <div class="input-hint">
            格式：https://your-service-id.run.tcloudbase.com
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveUrlConfig">保存配置</el-button>
          <el-button v-if="appStore.cloudRunUrl" type="danger" plain @click="clearUrlConfig">
            清除配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 名言管理 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="section-header">
          <el-icon><ChatLineRound /></el-icon>
          <span>名言管理</span>
        </div>
      </template>
      <div class="setting-row" @click="$router.push('/quote-manage')">
        <div class="setting-left">
          <span class="setting-label">管理名言</span>
          <span class="setting-hint">添加、编辑、删除首页名言</span>
        </div>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </el-card>

    <!-- 开发工具 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="section-header">
          <el-icon><Tools /></el-icon>
          <span>开发工具</span>
        </div>
      </template>
      <div class="setting-row" @click="$router.push('/api-log')">
        <div class="setting-left">
          <span class="setting-label">接口日志</span>
          <span class="setting-hint">查看请求耗时与响应正文</span>
        </div>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </el-card>

    <!-- 缓存管理 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="section-header">
          <el-icon><Delete /></el-icon>
          <span>缓存管理</span>
        </div>
      </template>
      <el-button type="danger" @click="handleClearCache">
        <el-icon><Delete /></el-icon> 清除所有缓存
      </el-button>
    </el-card>

    <!-- 关于 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="section-header">
          <el-icon><InfoFilled /></el-icon>
          <span>关于</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="应用名称">旺财百宝箱</el-descriptions-item>
        <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
        <el-descriptions-item label="数据来源">AkShare</el-descriptions-item>
        <el-descriptions-item label="开发框架">Vue3 + ElementPlus</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { clearCache } from '@/utils/cache'
import { Brush, SetUp, ChatLineRound, Tools, Delete, InfoFilled, ArrowRight } from '@element-plus/icons-vue'

const appStore = useAppStore()
const cloudRunUrlInput = ref('')
const urlError = ref('')

onMounted(() => {
  appStore.initCloudRunUrl()
  cloudRunUrlInput.value = appStore.cloudRunUrl
})

function saveUrlConfig() {
  urlError.value = ''
  const result = appStore.setCloudRunUrl(cloudRunUrlInput.value)
  if (result.success) {
    ElMessage.success('配置已保存')
  } else {
    urlError.value = result.error
  }
}

function clearUrlConfig() {
  ElMessageBox.confirm('确定要清除云托管地址配置吗？', '确认清除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    appStore.clearCloudRunUrl()
    cloudRunUrlInput.value = ''
    urlError.value = ''
    ElMessage.success('已清除')
  }).catch(() => {})
}

function handleClearCache() {
  ElMessageBox.confirm('确定要清除所有缓存吗？（自选数据也会被清除）', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    clearCache()
    ElMessageBox.alert('缓存已清除，请刷新页面', '完成')
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.input-hint {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  transition: background-color 0.15s;
  border-radius: 4px;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.setting-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  color: var(--text-color);
}

.setting-hint {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.arrow {
  color: var(--text-color-secondary);
}
</style>
