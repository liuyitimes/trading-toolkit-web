<template>
  <div class="page-container">
    <div class="page-header">
      <h2>接口日志</h2>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="search"
        placeholder="搜索路径或响应"
        clearable
        style="width: 280px"
        @keyup.enter="doSearch"
      />
      <div class="toolbar-actions">
        <el-button type="primary" @click="doRefresh">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button type="danger" @click="clearLogs">
          <el-icon><Delete /></el-icon> 清空
        </el-button>
      </div>
    </div>

    <!-- 连通性状态条 -->
    <div class="conn-bar" :class="connStatus">
      <span class="conn-dot" />
      <span v-if="connStatus === 'checking'" class="conn-text">正在检测后端连接...</span>
      <span v-else-if="connStatus === 'connected'" class="conn-text">
        已连接{{ pingDuration ? ' · 探测 ' + pingDuration + 'ms' : '' }}
      </span>
      <span v-else-if="connStatus === 'failed'" class="conn-text">
        连接失败 · {{ errorTitle }}
      </span>
      <span v-else class="conn-text">未检测</span>
      <el-button v-if="connStatus !== 'checking'" link size="small" @click="copyBaseUrl">
        复制地址
      </el-button>
    </div>

    <!-- 后端地址条 -->
    <div class="baseurl-bar" @click="copyBaseUrl">
      <span class="baseurl-label">后端:</span>
      <span class="baseurl-text">{{ baseUrl }}</span>
    </div>

    <!-- 错误面板 -->
    <el-alert
      v-if="connStatus === 'failed'"
      :title="errorTitle"
      type="error"
      :description="errorDetail"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    >
      <template #default>
        <div class="error-actions">
          <el-button type="primary" size="small" @click="$router.push('/settings')">去设置</el-button>
          <el-button size="small" @click="doRefresh">重试</el-button>
        </div>
      </template>
    </el-alert>

    <!-- 摘要 -->
    <div v-if="connStatus === 'connected' && total > 0" class="summary-bar">
      共 {{ total }} 条日志 · 当前 {{ logs.length }} 条
    </div>

    <!-- 加载中 -->
    <div v-if="loading && connStatus !== 'failed'" class="loading-bar">
      {{ connStatus === 'checking' ? '正在连接后端...' : '加载中...' }}
    </div>

    <!-- 日志列表 -->
    <div v-if="connStatus === 'connected' && logs.length > 0" class="log-list">
      <el-card
        v-for="(log, index) in logs"
        :key="log.id"
        shadow="hover"
        class="log-card"
        @click="toggleExpand(index)"
      >
        <div class="log-header">
          <el-tag :type="log.method === 'GET' ? 'success' : log.method === 'POST' ? 'warning' : 'info'" size="small">
            {{ log.method }}
          </el-tag>
          <span class="log-path">{{ log.path }}</span>
          <el-tag :type="log.status >= 400 ? 'danger' : 'success'" size="small">
            {{ log.status }}
          </el-tag>
        </div>
        <div class="log-meta">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-duration" :class="{ slow: log.duration > 1000 }">{{ log.duration }}ms</span>
          <el-tag v-if="log.truncated" type="info" size="small">已截断</el-tag>
          <span class="log-expand-hint">{{ log.expanded ? '收起 ▲' : '展开 ▼' }}</span>
        </div>
        <div v-if="log.expanded" class="log-body" @click.stop="copyLog(index)">
          <div v-if="log.request_body_view" class="body-section">
            <div class="body-label-row">
              <span class="body-label">请求正文</span>
            </div>
            <pre class="json-view">{{ log.request_body_view }}</pre>
          </div>
          <div class="body-section">
            <div class="body-label-row">
              <span class="body-label">响应数据</span>
              <span class="copy-hint">点击区域可复制</span>
            </div>
            <pre class="json-view">{{ log.response_body_view }}</pre>
          </div>
        </div>
      </el-card>

      <div class="load-more-bar">
        <el-button v-if="hasMore" :loading="loading" @click="loadMore">
          {{ loading ? '加载中...' : '加载更多' }}
        </el-button>
        <span v-else class="bottom-tip">— 已加载全部 —</span>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="connStatus === 'connected' && !loading && logs.length === 0 && !errorMsg"
      description="暂无日志数据"
    >
      <template #default>
        <p class="empty-hint">发送 API 请求后会自动记录</p>
        <el-button type="primary" @click="doRefresh">刷新</el-button>
      </template>
    </el-empty>

    <el-empty
      v-if="connStatus === 'connected' && errorMsg"
      :description="errorMsg"
    >
      <template #default>
        <el-button type="primary" @click="doRefresh">重试</el-button>
      </template>
    </el-empty>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete } from '@element-plus/icons-vue'
import axios from 'axios'
import { analyzeBaseUrl, parseRequestError } from '@/utils/baseUrl'

const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(30)
const hasMore = ref(false)
const search = ref('')
const loading = ref(false)
const connStatus = ref('unknown')
const errorMsg = ref('')
const errorTitle = ref('')
const errorDetail = ref('')
const errorCode = ref('')
const baseUrl = ref('')
const pingDuration = ref(null)

const FALLBACK_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function getBaseUrl() {
  const url = localStorage.getItem('cloudRunUrl')
  if (url) return url.replace(/\/+$/, '')
  return FALLBACK_BASE_URL
}

function getBaseUrlInfo() {
  return analyzeBaseUrl(getBaseUrl())
}

onMounted(() => {
  const realUrl = getBaseUrl()
  baseUrl.value = realUrl
  pingAndFetch()
})

async function pingAndFetch() {
  if (loading.value) return
  const baseUrlInfo = getBaseUrlInfo()
  if (!baseUrlInfo.valid) {
    connStatus.value = 'failed'
    errorTitle.value = '后端地址无效'
    errorDetail.value = baseUrlInfo.hint
    errorCode.value = 'invalid_url'
    loading.value = false
    return
  }
  connStatus.value = 'checking'
  loading.value = true
  errorTitle.value = ''
  errorMsg.value = ''
  errorDetail.value = ''
  baseUrl.value = getBaseUrl()
  const pingStart = Date.now()
  try {
    const res = await axios.get(`${baseUrl.value}/api/v1/admin/health`, {
      timeout: 4000,
      validateStatus: () => true
    })
    const pingMs = Date.now() - pingStart
    if (res.status === 200 && res.data && res.data.success) {
      connStatus.value = 'connected'
      pingDuration.value = pingMs
      await fetchLogs()
    } else {
      connStatus.value = 'failed'
      loading.value = false
      errorTitle.value = `后端响应异常 (HTTP ${res.status})`
      errorDetail.value = '后端可达但返回了非预期内容，可能是服务内部错误'
      errorCode.value = 'bad_response'
    }
  } catch (err) {
    const parsed = parseRequestError(err, baseUrlInfo)
    connStatus.value = 'failed'
    loading.value = false
    errorTitle.value = parsed.title
    errorDetail.value = parsed.detail + '\n地址: ' + baseUrl.value
    errorCode.value = parsed.code
  }
}

async function fetchLogs() {
  loading.value = true
  errorMsg.value = ''
  const BASE_URL = getBaseUrl()
  let url = `${BASE_URL}/api/v1/admin/api-logs?page=${page.value}&page_size=${pageSize.value}`
  if (search.value) url += `&search=${encodeURIComponent(search.value)}`
  try {
    const res = await axios.get(url, { timeout: 10000 })
    if (res.status === 200 && res.data && res.data.success) {
      const data = res.data.data || {}
      const newLogs = (data.logs || []).map(l => ({
        ...l,
        expanded: false,
        request_body_view: l.request_body || '',
        response_body_view: l.response_body || '(无响应数据)',
        truncated: !!l.truncated
      }))
      const mergedLogs = page.value === 1 ? newLogs : [...logs.value, ...newLogs]
      logs.value = mergedLogs
      total.value = data.total || 0
      hasMore.value = !!data.has_more
    } else {
      errorMsg.value = `服务异常：HTTP ${res.status}` + (res.data && res.data.error ? `，${res.data.error.message}` : '')
    }
  } catch (err) {
    console.error('获取日志失败:', err)
    const parsed = parseRequestError(err, getBaseUrlInfo())
    connStatus.value = 'failed'
    errorTitle.value = parsed.title
    errorDetail.value = parsed.detail
    errorCode.value = parsed.code
  } finally {
    loading.value = false
  }
}

function doRefresh() {
  page.value = 1
  errorMsg.value = ''
  errorTitle.value = ''
  errorDetail.value = ''
  pingAndFetch()
}

function doSearch() {
  page.value = 1
  fetchLogs()
}

function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1
  fetchLogs()
}

function toggleExpand(index) {
  const log = logs.value[index]
  if (!log) return
  log.expanded = !log.expanded
}

async function clearLogs() {
  if (connStatus.value !== 'connected') {
    ElMessage.warning('后端未连接')
    return
  }
  try {
    await ElMessageBox.confirm('确定要清空所有接口日志吗？', '确认清空', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const BASE_URL = getBaseUrl()
    const res = await axios.post(`${BASE_URL}/api/v1/admin/api-logs/clear`, {}, { timeout: 10000 })
    if (res.status === 200 && res.data && res.data.success) {
      logs.value = []
      total.value = 0
      hasMore.value = false
      page.value = 1
      ElMessage.success('已清空')
    } else {
      ElMessage.error('清空失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('清空失败')
    }
  }
}

async function copyLog(index) {
  const log = logs.value[index]
  if (!log) return
  const text = `[${log.method}] ${log.path}\n状态: ${log.status}  耗时: ${log.duration}ms  时间: ${log.time}\n\n[请求正文]\n${log.request_body_view || '(无)'}\n\n[响应数据]\n${log.response_body_view || '(无)'}`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function copyBaseUrl() {
  try {
    await navigator.clipboard.writeText(baseUrl.value)
    ElMessage.success('地址已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
}

.conn-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;

  &.unknown {
    background-color: var(--el-fill-color-light);
    color: var(--text-color-secondary);
  }
  &.checking {
    background-color: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }
  &.connected {
    background-color: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }
  &.failed {
    background-color: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.conn-text {
  flex: 1;
}

.baseurl-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--el-color-warning-light-9);
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  cursor: pointer;

  .baseurl-label {
    color: var(--el-color-warning);
    font-weight: 500;
  }
  .baseurl-text {
    color: var(--text-color-secondary);
    word-break: break-all;
  }
}

.error-actions {
  margin-top: 8px;
}

.summary-bar {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.loading-bar {
  text-align: center;
  padding: 20px;
  color: var(--text-color-secondary);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-card {
  cursor: pointer;
  transition: transform 0.15s;

  &:hover {
    transform: translateY(-1px);
  }

  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.log-path {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  word-break: break-all;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-color-secondary);

  .log-duration {
    &.slow {
      color: var(--el-color-danger);
      font-weight: 500;
    }
  }

  .log-expand-hint {
    margin-left: auto;
    color: var(--el-color-primary);
  }
}

.log-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.body-section {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.body-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.body-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.copy-hint {
  font-size: 11px;
  color: var(--el-color-primary);
}

.json-view {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 10px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-color);
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

.load-more-bar {
  text-align: center;
  padding: 16px;
}

.bottom-tip {
  color: var(--text-color-secondary);
  font-size: 13px;
}

.empty-hint {
  color: var(--text-color-secondary);
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
