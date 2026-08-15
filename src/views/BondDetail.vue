<template>
  <div class="page-container" v-loading="loading">
    <!-- 顶部：返回 + 标题 + 自选 -->
    <div class="page-header">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2 class="page-title">
        <el-tag v-if="d" :type="exchangeTagType" size="small" effect="dark">{{
          exchangeLabel
        }}</el-tag>
        <span class="title-text">{{
          d ? `${d.bond_name} ${d.bond_code}` : '可转债详情'
        }}</span>
        <TierBadge tier="beginner" :threshold="10000" />
      </h2>
      <el-button
        v-if="d"
        :type="isFav ? 'warning' : 'default'"
        size="small"
        @click="toggleFav"
      >
        <el-icon><StarFilled v-if="isFav" /><Star v-else /></el-icon>
        {{ isFav ? '取消自选' : '加入自选' }}
      </el-button>
    </div>

    <template v-if="d">
      <el-row :gutter="16">
        <!-- 左列：基础信息 + 各进度卡片 + 条款 -->
        <el-col :xs="24" :md="16">
          <!-- 7.1 基础信息表 -->
          <el-card shadow="hover" class="block-card">
            <template #header><span>基础信息</span></template>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="转债代码">{{
                d.bond_code
              }}</el-descriptions-item>
              <el-descriptions-item label="转债名称">{{
                d.bond_name
              }}</el-descriptions-item>
              <el-descriptions-item label="正股代码">{{
                d.stock_code || '--'
              }}</el-descriptions-item>
              <el-descriptions-item label="正股名称">{{
                d.stock_name || '--'
              }}</el-descriptions-item>
              <el-descriptions-item label="转债价格">{{
                formatNumber(d.price)
              }}</el-descriptions-item>
              <el-descriptions-item label="转股价值">{{
                formatNumber(d.conversion_value)
              }}</el-descriptions-item>
              <el-descriptions-item label="溢价率">
                <span :style="{ color: formatColor(d.premium_rate) }">
                  {{ formatNumber(d.premium_rate) }}%
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="双低值">{{
                formatNumber(d.double_low, 1)
              }}</el-descriptions-item>
              <el-descriptions-item label="到期收益率">
                {{ d.ytm != null ? formatNumber(d.ytm) + '%' : '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="剩余规模">
                {{
                  d.remaining_size != null
                    ? formatNumber(d.remaining_size) + ' 亿'
                    : '--'
                }}
              </el-descriptions-item>
              <el-descriptions-item label="评级">{{
                d.rating || '--'
              }}</el-descriptions-item>
              <el-descriptions-item label="到期日">{{
                formatDate(d.maturity_date)
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 7.2 强制赎回进度 -->
          <el-card shadow="hover" class="block-card">
            <template #header><span>强制赎回进度</span></template>
            <div v-if="hasForceRedeemData" class="progress-block">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="转股价">{{
                  formatNumber(d.conversion_price)
                }}</el-descriptions-item>
                <el-descriptions-item label="强赎触发价">{{
                  formatNumber(forceRedeemPrice)
                }}</el-descriptions-item>
                <el-descriptions-item label="正股价">{{
                  formatNumber(d.stock_price)
                }}</el-descriptions-item>
                <el-descriptions-item label="距强赎线差幅">
                  <span
                    :class="forceRedeemGap >= 0 ? 'gap-danger' : 'gap-success'"
                  >
                    {{ formatForceRedeemGap }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
              <div class="progress-wrapper">
                <div class="progress-line">
                  <span class="progress-label">距强赎线进度</span>
                  <span
                    class="progress-hint"
                    :class="forceRedeemGap >= 0 ? 'gap-danger' : 'gap-success'"
                  >
                    {{
                      forceRedeemGap >= 0
                        ? '已接近/触发强赎区域'
                        : '处于安全区域'
                    }}
                  </span>
                </div>
                <el-progress
                  :percentage="forceRedeemPercent"
                  :color="forceRedeemColor"
                  :stroke-width="14"
                  :format="progressFormat"
                />
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </el-card>

          <!-- 7.3 下修进度 -->
          <el-card shadow="hover" class="block-card">
            <template #header><span>下修进度</span></template>
            <div v-if="hasReviseData" class="progress-block">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="转股价">{{
                  formatNumber(d.conversion_price)
                }}</el-descriptions-item>
                <el-descriptions-item label="下修触发价">{{
                  formatNumber(revisePrice)
                }}</el-descriptions-item>
                <el-descriptions-item label="正股价">{{
                  formatNumber(d.stock_price)
                }}</el-descriptions-item>
                <el-descriptions-item label="距下修线差幅">
                  <span :class="reviseGap < 0 ? 'gap-warning' : ''">
                    {{ formatReviseGap }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
              <div class="progress-wrapper">
                <div class="progress-line">
                  <span class="progress-label">距下修线进度</span>
                  <span
                    class="progress-hint"
                    :class="reviseGap < 0 ? 'gap-warning' : ''"
                  >
                    {{
                      reviseGap < 0
                        ? '正股已跌破下修线，可能触发下修'
                        : '未触发下修'
                    }}
                  </span>
                </div>
                <el-progress
                  :percentage="revisePercent"
                  :color="reviseColor"
                  :stroke-width="14"
                  :format="progressFormat"
                />
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </el-card>

          <!-- 7.4 折价空间 -->
          <el-card shadow="hover" class="block-card">
            <template #header><span>折价空间</span></template>
            <div class="discount-block">
              <div class="discount-row">
                <span class="discount-label">折价空间：</span>
                <span
                  class="discount-value"
                  :class="hasDiscount ? 'gap-success' : ''"
                >
                  {{
                    hasDiscount
                      ? Math.abs(d.premium_rate).toFixed(2) + '%'
                      : '无折价'
                  }}
                </span>
                <el-tag
                  v-if="hasDiscount"
                  type="success"
                  size="small"
                  effect="dark"
                  >有折价</el-tag
                >
                <el-tag v-else type="info" size="small" effect="plain"
                  >无折价</el-tag
                >
              </div>
              <div class="discount-hint">
                折价空间 = |溢价率|，当转债折价时存在套利机会
              </div>
            </div>
          </el-card>

          <!-- 7.5 条款信息 -->
          <el-card shadow="hover" class="block-card">
            <template #header><span>条款信息</span></template>
            <div class="clause-list">
              <div class="clause-item">
                <div class="clause-title">强赎条款</div>
                <div class="clause-text">{{ d.call_clause || '暂无' }}</div>
              </div>
              <div class="clause-item">
                <div class="clause-title">回售条款</div>
                <div class="clause-text">{{ d.put_clause || '暂无' }}</div>
              </div>
              <div class="clause-item">
                <div class="clause-title">下修条款</div>
                <div class="clause-text">{{ d.reset_clause || '暂无' }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右列：操作卡片 -->
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="action-card">
            <template #header><span>操作</span></template>
            <div class="action-buttons">
              <el-button
                :type="isFav ? 'warning' : 'default'"
                @click="toggleFav"
                style="width: 100%"
              >
                <el-icon><StarFilled v-if="isFav" /><Star v-else /></el-icon>
                {{ isFav ? '取消自选' : '加入自选' }}
              </el-button>
            </div>
            <el-divider />
            <div class="quick-info">
              <div class="quick-info-row">
                <span class="quick-info-label">交易所</span>
                <span class="quick-info-value">{{ exchangeLabel }}</span>
              </div>
              <div class="quick-info-row">
                <span class="quick-info-label">纯债价值</span>
                <span class="quick-info-value">{{
                  formatNumber(d.pure_bond_value)
                }}</span>
              </div>
              <div class="quick-info-row">
                <span class="quick-info-label">转股价</span>
                <span class="quick-info-value">{{
                  formatNumber(d.conversion_price)
                }}</span>
              </div>
              <div class="quick-info-row">
                <span class="quick-info-label">正股价</span>
                <span class="quick-info-value">{{
                  formatNumber(d.stock_price)
                }}</span>
              </div>
              <div class="quick-info-row">
                <span class="quick-info-label">成交量</span>
                <span class="quick-info-value">{{
                  formatVolume(d.volume)
                }}</span>
              </div>
              <div class="quick-info-row">
                <span class="quick-info-label">成交额</span>
                <span class="quick-info-value">{{
                  formatAmount(d.amount)
                }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty
      v-if="!loading && !d"
      :description="loadError ? '详情加载失败，请重试' : '未找到该可转债'"
    >
      <el-button type="primary" @click="loadDetail">重试</el-button>
      <el-button type="primary" @click="router.back()">返回列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Star, StarFilled } from '@element-plus/icons-vue'
import { convertibleApi } from '@/api/convertible'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { formatNumber, formatDate, formatColor } from '@/utils/format'
import TierBadge from '@/components/TierBadge.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const raw = ref(null)
const loading = ref(true)
const loadError = ref(false)

const d = computed(() => raw.value)

const isFav = computed(() =>
  userStore.isFavorite('convertible', route.params.code)
)

async function loadDetail({ refresh = false } = {}) {
  loading.value = true
  loadError.value = false
  try {
    const data = await convertibleApi.detail(
      route.params.code,
      refresh ? { refresh: true } : {}
    )
    raw.value = data && data.bond_code ? data : null
    if (!raw.value) loadError.value = true
    else appStore.setLastUpdated()
    return Boolean(raw.value)
  } catch {
    if (!raw.value) raw.value = null
    loadError.value = true
    return false
  } finally {
    loading.value = false
  }
}

let unregisterRefresh
onMounted(() => {
  unregisterRefresh = appStore.registerPageRefresh(route.path, loadDetail)
  loadDetail()
})

onUnmounted(() => {
  unregisterRefresh?.()
})

function toggleFav() {
  userStore.toggleFavorite(
    'convertible',
    route.params.code,
    raw.value?.bond_name
  )
}

// ---- 交易所 ----
const exchangeLabel = computed(() => {
  const ex = d.value?.exchange
  if (ex === 'sh') return '沪市'
  if (ex === 'sz') return '深市'
  if (ex === 'bj') return '京市'
  return '--'
})
const exchangeTagType = computed(() => {
  const ex = d.value?.exchange
  if (ex === 'sh') return 'danger'
  if (ex === 'sz') return 'primary'
  if (ex === 'bj') return 'warning'
  return 'info'
})

// ---- 7.2 强制赎回进度 ----
const hasForceRedeemData = computed(() => {
  const v = raw.value
  return !!(v && v.conversion_price > 0 && v.stock_price > 0)
})

const forceRedeemPrice = computed(() => {
  if (!hasForceRedeemData.value) return null
  return raw.value.conversion_price * 1.3
})

// 距强赎线差幅 = (正股价 - 转股价*1.3) / (转股价*1.3) * 100
const forceRedeemGap = computed(() => {
  if (!hasForceRedeemData.value) return null
  const fp = forceRedeemPrice.value
  return ((raw.value.stock_price - fp) / fp) * 100
})

const formatForceRedeemGap = computed(() => {
  if (forceRedeemGap.value == null) return '--'
  const g = forceRedeemGap.value
  return (g >= 0 ? '+' : '') + g.toFixed(2) + '%'
})

// 进度条：stockPrice/forcePrice 映射到 0~100%
const forceRedeemPercent = computed(() => {
  if (!hasForceRedeemData.value) return 0
  const pct = (raw.value.stock_price / forceRedeemPrice.value) * 100
  return Math.min(Math.max(pct, 0), 100)
})

const forceRedeemColor = computed(() => {
  if (forceRedeemGap.value == null) return ''
  return forceRedeemGap.value >= 0
    ? 'var(--el-color-danger)'
    : 'var(--el-color-success)'
})

// ---- 7.3 下修进度 ----
const hasReviseData = computed(() => {
  const v = raw.value
  return !!(v && v.conversion_price > 0 && v.stock_price > 0)
})

const revisePrice = computed(() => {
  if (!hasReviseData.value) return null
  return raw.value.conversion_price * 0.85
})

// 距下修线差幅 = (正股价 - 转股价*0.85) / (转股价*0.85) * 100
const reviseGap = computed(() => {
  if (!hasReviseData.value) return null
  const rp = revisePrice.value
  return ((raw.value.stock_price - rp) / rp) * 100
})

const formatReviseGap = computed(() => {
  if (reviseGap.value == null) return '--'
  return reviseGap.value.toFixed(2) + '%'
})

// 进度条：revisePrice/stockPrice 映射到 0~100%（正股价越低越接近下修）
const revisePercent = computed(() => {
  if (!hasReviseData.value) return 0
  const pct = (revisePrice.value / raw.value.stock_price) * 100
  return Math.min(Math.max(pct, 0), 100)
})

const reviseColor = computed(() => {
  if (reviseGap.value == null) return ''
  return reviseGap.value < 0
    ? 'var(--el-color-warning)'
    : 'var(--el-color-primary)'
})

// ---- 7.4 折价空间 ----
const hasDiscount = computed(() => {
  const v = raw.value
  return !!(v && v.premium_rate != null && v.premium_rate < 0)
})

// ---- el-progress 格式化 ----
function progressFormat(p) {
  return p.toFixed(0) + '%'
}

// ---- 成交量/额格式化 ----
function formatVolume(vol) {
  if (!vol || vol <= 0) return '--'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + ' 万手'
  return vol.toFixed(0) + ' 手'
}

function formatAmount(amt) {
  if (!amt || amt <= 0) return '--'
  if (amt >= 1e8) return (amt / 1e8).toFixed(2) + ' 亿'
  if (amt >= 1e4) return (amt / 1e4).toFixed(2) + ' 万'
  return amt.toFixed(0)
}
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .page-title {
    margin: 0;
    flex: 1;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.block-card {
  margin-bottom: 16px;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px 0;
}

.progress-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.progress-label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.progress-hint {
  font-size: 0.75rem;
  color: var(--text-color-placeholder);
}

.gap-danger {
  color: var(--el-color-danger);
  font-weight: 600;
}
.gap-success {
  color: var(--el-color-success);
  font-weight: 600;
}
.gap-warning {
  color: var(--el-color-warning);
  font-weight: 600;
}

.discount-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discount-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.discount-label {
  color: var(--text-color-secondary);
}

.discount-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-color);
}

.discount-hint {
  font-size: 0.75rem;
  color: var(--text-color-placeholder);
  line-height: 1.5;
}

.clause-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.clause-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clause-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  padding-left: 8px;
  border-left: 3px solid var(--el-color-primary);
}

.clause-text {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  line-height: 1.7;
  padding-left: 11px;
  word-break: break-all;
}

.action-card {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.quick-info-label {
  color: var(--text-color-secondary);
}

.quick-info-value {
  color: var(--text-color);
  font-weight: 500;
}

// 响应式
@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;

    .page-title {
      font-size: 1.1rem;
      flex: 1 1 100%;
      order: -1;
    }
  }
}
</style>
