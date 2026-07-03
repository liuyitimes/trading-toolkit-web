<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2>可转债详情</h2>
    </div>

    <template v-if="d">
      <!-- 头部卡片 -->
      <el-card shadow="hover" class="header-card">
        <div class="header-top">
          <div class="header-left">
            <el-tag :type="d.exchange === 'sh' ? 'danger' : 'primary'" size="small" effect="dark">
              {{ d.exchange === 'sh' ? '沪市' : d.exchange === 'sz' ? '深市' : d.exchange === 'bj' ? '京市' : '--' }}
            </el-tag>
            <span class="bond-name">{{ d.bond_name }}</span>
            <span class="bond-code">{{ d.bond_code }}</span>
          </div>
          <el-button
            :type="isFav ? 'warning' : 'default'"
            size="small"
            @click="toggleFav"
          >
            <el-icon><StarFilled v-if="isFav" /><Star v-else /></el-icon>
            {{ isFav ? '已自选' : '加自选' }}
          </el-button>
        </div>

        <div class="header-price-row">
          <div class="price-block">
            <span class="price-label">转债价格</span>
            <span class="price-value" :class="priceClass">{{ fmt(d.price) }}</span>
            <span class="price-change" :class="changeClass">
              {{ d.change_pct >= 0 ? '+' : '' }}{{ d.change_pct?.toFixed(2) }}%
            </span>
          </div>
          <div class="price-block">
            <span class="price-label">正股价</span>
            <span class="price-value">{{ fmt(d.stock_price) }}</span>
            <span class="stock-name">{{ d.stock_name }} ({{ d.stock_code }})</span>
          </div>
        </div>

        <div class="metrics-row">
          <div class="metric">
            <span class="metric-label">转股价值</span>
            <span class="metric-value">{{ fmt(d.conversion_value) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">溢价率</span>
            <span class="metric-value" :class="d.premium_rate < 0 ? 'positive' : d.premium_rate > 30 ? 'danger' : ''">
              {{ d.premium_rate?.toFixed(2) }}%
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">双低值</span>
            <span class="metric-value" :class="d.double_low < 130 ? 'positive' : d.double_low > 160 ? 'danger' : ''">
              {{ fmt(d.double_low, 1) }}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">转股价</span>
            <span class="metric-value">{{ fmt(d.conversion_price) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 衍生指标卡片 -->
      <el-card shadow="hover" class="derived-card">
        <template #header><span>关键指标</span></template>
        <div class="derived-grid">
          <div class="derived-item">
            <span class="derived-label">强赎触发距离</span>
            <span class="derived-value" :class="forceRedeemClass">{{ forceRedeemGap }}</span>
            <span class="derived-hint">正股价 / 转股价×1.3</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">下修触发距离</span>
            <span class="derived-value" :class="downReviseClass">{{ downReviseGap }}</span>
            <span class="derived-hint">正股价 / 转股价×0.85</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">折价空间</span>
            <span class="derived-value" :class="discountClass">{{ discountSpace }}</span>
            <span class="derived-hint">溢价率 &lt; 0 时</span>
          </div>
          <div class="derived-item">
            <span class="derived-label">信用评级</span>
            <span class="derived-value">{{ d.rating || '--' }}</span>
            <span class="derived-hint">主体信用</span>
          </div>
        </div>
      </el-card>

      <el-row :gutter="16">
        <!-- 左列：基本信息 + 条款 -->
        <el-col :xs="24" :md="16">
          <!-- 基本信息 -->
          <el-card shadow="hover" class="info-card">
            <template #header><span>基本信息</span></template>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="债券代码">{{ d.bond_code }}</el-descriptions-item>
              <el-descriptions-item label="债券名称">{{ d.bond_name }}</el-descriptions-item>
              <el-descriptions-item label="正股代码">{{ d.stock_code || '--' }}</el-descriptions-item>
              <el-descriptions-item label="正股名称">{{ d.stock_name || '--' }}</el-descriptions-item>
              <el-descriptions-item label="现价">{{ fmt(d.price) }}</el-descriptions-item>
              <el-descriptions-item label="涨跌幅">
                <span :class="changeClass">{{ d.change_pct >= 0 ? '+' : '' }}{{ d.change_pct?.toFixed(2) }}%</span>
              </el-descriptions-item>
              <el-descriptions-item label="开盘价">{{ fmt(d.open) }}</el-descriptions-item>
              <el-descriptions-item label="最高价">{{ fmt(d.high) }}</el-descriptions-item>
              <el-descriptions-item label="最低价">{{ fmt(d.low) }}</el-descriptions-item>
              <el-descriptions-item label="成交量">{{ fmtVolume(d.volume) }}</el-descriptions-item>
              <el-descriptions-item label="成交额">{{ fmtAmount(d.amount) }}</el-descriptions-item>
              <el-descriptions-item label="换手率">{{ d.turnover ? d.turnover.toFixed(2) + '%' : '--' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 转股信息 -->
          <el-card shadow="hover" class="info-card">
            <template #header><span>转股信息</span></template>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="转股价">{{ fmt(d.conversion_price) }}</el-descriptions-item>
              <el-descriptions-item label="正股价">{{ fmt(d.stock_price) }}</el-descriptions-item>
              <el-descriptions-item label="转股价值">{{ fmt(d.conversion_value) }}</el-descriptions-item>
              <el-descriptions-item label="溢价率">
                <span :class="d.premium_rate < 0 ? 'positive' : d.premium_rate > 30 ? 'danger' : ''">
                  {{ d.premium_rate?.toFixed(2) }}%
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="双低值">{{ fmt(d.double_low, 1) }}</el-descriptions-item>
              <el-descriptions-item label="信用评级">{{ d.rating || '--' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 发行信息 -->
          <el-card shadow="hover" class="info-card">
            <template #header><span>发行信息</span></template>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="发行规模">{{ d.remaining_size ? d.remaining_size.toFixed(2) + ' 亿' : '--' }}</el-descriptions-item>
              <el-descriptions-item label="上市时间">{{ d.list_date || '--' }}</el-descriptions-item>
              <el-descriptions-item label="到期日">{{ d.maturity_date || '--' }}</el-descriptions-item>
              <el-descriptions-item label="剩余年限">{{ d.remaining_years != null ? d.remaining_years.toFixed(2) + ' 年' : '--' }}</el-descriptions-item>
              <el-descriptions-item label="票面利率">{{ d.coupon_rate != null ? d.coupon_rate.toFixed(2) + '%' : '--' }}</el-descriptions-item>
              <el-descriptions-item label="到期收益率">{{ d.ytm != null ? (d.ytm >= 0 ? '+' : '') + d.ytm.toFixed(2) + '%' : '--' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- 右列：操作 + 条款 -->
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="action-card">
            <template #header><span>操作</span></template>
            <div class="action-buttons">
              <el-button
                :type="isFav ? 'warning' : 'primary'"
                @click="toggleFav"
                style="width: 100%"
              >
                <el-icon><StarFilled v-if="isFav" /><Star v-else /></el-icon>
                {{ isFav ? '取消自选' : '加入自选' }}
              </el-button>
              <el-button @click="copyCode" style="width: 100%">
                <el-icon><CopyDocument /></el-icon> 复制代码
              </el-button>
              <el-button @click="goStock" :disabled="!d.stock_code" style="width: 100%">
                <el-icon><Search /></el-icon> 查看正股
              </el-button>
            </div>
          </el-card>

          <el-card shadow="hover" class="action-card">
            <template #header><span>条款信息</span></template>
            <div v-if="termsList.length" class="terms-list">
              <div v-for="term in termsList" :key="term.label" class="term-item">
                <span class="term-label">{{ term.label }}</span>
                <span class="term-value">{{ term.value }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无条款信息" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty v-if="!loading && !d" description="未找到该可转债">
      <el-button type="primary" @click="router.back()">返回列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Star, StarFilled, CopyDocument, Search } from '@element-plus/icons-vue'
import { convertibleApi } from '@/api/convertible'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const raw = ref(null)
const loading = ref(true)

const d = computed(() => raw.value)

const isFav = computed(() => userStore.isFavorite('convertible', route.params.code))

onMounted(async () => {
  try {
    const data = await convertibleApi.detail(route.params.code)
    raw.value = (data && data.bond_code) ? data : null
  } catch {
    raw.value = null
  } finally {
    loading.value = false
  }
})

function toggleFav() {
  userStore.toggleFavorite('convertible', route.params.code, raw.value?.bond_name)
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(raw.value?.bond_code || '')
    ElMessage.success('已复制代码')
  } catch {
    ElMessage.error('复制失败')
  }
}

function goStock() {
  if (raw.value?.stock_code) {
    window.open(`https://xueqiu.com/S/${raw.value.stock_code}`, '_blank')
  }
}

// ---- 格式化 ----
function fmt(val, decimals = 2) {
  if (val == null || isNaN(val)) return '--'
  return Number(val).toFixed(decimals)
}

function fmtVolume(vol) {
  if (!vol || vol <= 0) return '--'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + ' 万手'
  return vol.toFixed(0) + ' 手'
}

function fmtAmount(amt) {
  if (!amt || amt <= 0) return '--'
  if (amt >= 1e8) return (amt / 1e8).toFixed(2) + ' 亿'
  if (amt >= 1e4) return (amt / 1e4).toFixed(2) + ' 万'
  return amt.toFixed(0)
}

// ---- 衍生指标计算 ----
const priceClass = computed(() => {
  if (!raw.value) return ''
  return raw.value.change_pct >= 0 ? 'danger' : 'positive'
})

const changeClass = computed(() => {
  if (!raw.value) return ''
  return raw.value.change_pct >= 0 ? 'danger' : 'positive'
})

const forceRedeemGap = computed(() => {
  const d = raw.value
  if (!d || d.conversion_price <= 0 || d.stock_price <= 0) return '--'
  const forcePrice = d.conversion_price * 1.3
  const gap = (d.stock_price - forcePrice) / forcePrice * 100
  return (gap >= 0 ? '+' : '') + gap.toFixed(1) + '%'
})

const forceRedeemClass = computed(() => {
  const d = raw.value
  if (!d || d.conversion_price <= 0 || d.stock_price <= 0) return ''
  const forcePrice = d.conversion_price * 1.3
  return d.stock_price >= forcePrice ? 'danger' : ''
})

const downReviseGap = computed(() => {
  const d = raw.value
  if (!d || d.conversion_price <= 0 || d.stock_price <= 0) return '--'
  const revisePrice = d.conversion_price * 0.85
  const gap = (d.stock_price - revisePrice) / revisePrice * 100
  return gap.toFixed(1) + '%'
})

const downReviseClass = computed(() => {
  const d = raw.value
  if (!d || d.conversion_price <= 0 || d.stock_price <= 0) return ''
  const revisePrice = d.conversion_price * 0.85
  return d.stock_price < revisePrice ? 'warning' : ''
})

const discountSpace = computed(() => {
  const d = raw.value
  if (!d || d.premium_rate >= 0) return '--'
  return Math.abs(d.premium_rate).toFixed(2) + '%'
})

const discountClass = computed(() => {
  const d = raw.value
  if (!d || d.premium_rate >= 0) return ''
  return 'positive'
})

const termsList = computed(() => {
  const d = raw.value
  if (!d) return []
  const items = []
  if (d.apply_date) items.push({ label: '申购日期', value: d.apply_date })
  if (d.apply_code) items.push({ label: '申购代码', value: d.apply_code })
  if (d.apply_limit) items.push({ label: '申购上限(张)', value: d.apply_limit })
  if (d.lottery_date) items.push({ label: '中签号发布日', value: d.lottery_date })
  if (d.lottery_rate) items.push({ label: '中签率', value: (d.lottery_rate * 100).toFixed(4) + '%' })
  if (d.list_date) items.push({ label: '上市时间', value: d.list_date })
  if (d.maturity_date) items.push({ label: '到期日', value: d.maturity_date })
  if (d.issue_size) items.push({ label: '发行规模(亿)', value: d.issue_size.toFixed(2) })
  if (d.remaining_size) items.push({ label: '剩余规模(亿)', value: d.remaining_size.toFixed(2) })
  return items
})
</script>

<style lang="scss" scoped>
.header-card {
  margin-bottom: 16px;

  :deep(.el-card__body) {
    padding: 20px 24px;
  }
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bond-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-color);
}

.bond-code {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-family: 'Consolas', monospace;
}

.header-price-row {
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.price-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.price-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-color);

  &.danger { color: var(--el-color-danger); }
  &.positive { color: var(--el-color-success); }
}

.price-change {
  font-size: 0.85rem;
  font-weight: 500;

  &.danger { color: var(--el-color-danger); }
  &.positive { color: var(--el-color-success); }
}

.stock-name {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 0.72rem;
  color: var(--text-color-secondary);
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);

  &.danger { color: var(--el-color-danger); }
  &.positive { color: var(--el-color-success); }
}

.derived-card {
  margin-bottom: 16px;
}

.derived-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.derived-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.derived-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.derived-value {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-color);

  &.danger { color: var(--el-color-danger); }
  &.warning { color: var(--el-color-warning); }
  &.positive { color: var(--el-color-success); }
}

.derived-hint {
  font-size: 0.68rem;
  color: var(--text-color-placeholder);
}

.info-card {
  margin-bottom: 16px;
}

.action-card {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.terms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.term-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  line-height: 1.6;

  .term-label {
    color: var(--text-color-secondary);
    flex-shrink: 0;
  }

  .term-value {
    color: var(--text-color);
    text-align: right;
    word-break: break-all;
  }
}

// 暗黑模式适配
:root.dark {
  .price-value, .metric-value, .derived-value {
    color: var(--text-color);
  }
}

// 响应式
@media (max-width: 768px) {
  .header-price-row {
    gap: 24px;
  }

  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .derived-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .price-value {
    font-size: 1.5rem;
  }

  .bond-name {
    font-size: 1.1rem;
  }
}
</style>
