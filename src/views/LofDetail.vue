<template>
  <div class="page-container lof-detail-page" v-loading="loading">
    <header class="page-header">
      <el-button text aria-label="返回 LOF 列表" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div v-if="d" class="identity">
        <div class="identity-title">
          <ExchangeBadge :exchange="d.instrument.exchange" />
          <h2>{{ d.instrument.name }}</h2>
          <span class="code">{{ d.instrument.code }}</span>
        </div>
        <TimeStamp v-if="d.instrument.quote_at" :time="d.instrument.quote_at" :stale-after="30" />
      </div>
      <el-button v-if="d" text :aria-label="isFavorite ? '取消自选' : '加入自选'" @click="toggleFavorite">
        <el-icon :class="{ favorite: isFavorite }"><StarFilled v-if="isFavorite" /><Star v-else /></el-icon>
      </el-button>
    </header>

    <template v-if="d">
      <section class="decision-band">
        <div class="decision-summary">
          <div>
            <div class="eyebrow">套利观察</div>
            <div class="status-line">
              <el-tag :type="statusType" size="small" effect="light">{{ statusLabel }}</el-tag>
              <span>{{ d.execution.trade_path_verified ? '执行路径证据已核验' : '执行路径证据未完整核验' }}</span>
            </div>
          </div>
          <div class="primary-metric">
            <span>当前溢价</span>
            <strong>{{ signedPct(d.premium.gross_pct) }}</strong>
          </div>
          <div class="primary-metric">
            <span>成本假设后</span>
            <strong :class="{ negative: d.premium.net_assumption_pct < 0 }">{{ signedPct(d.premium.net_assumption_pct) }}</strong>
          </div>
        </div>
        <div class="assumption-line">
          <span>场内价格 {{ fixed(d.instrument.price) }}</span>
          <span>最新单位净值 {{ fixed(d.instrument.valuation, 4) }}</span>
          <span>NAV 日期 {{ d.instrument.nav_date || '暂缺' }}</span>
          <span>申购费 {{ d.premium.cost_assumptions.purchase_fee_pct }}%</span>
          <span>卖出佣金 {{ d.premium.cost_assumptions.sell_commission_pct }}%</span>
        </div>
      </section>

      <section class="detail-band">
        <div class="section-heading">
          <div><div class="eyebrow">Premium Persistence</div><h3>溢价持续性</h3></div>
          <span>{{ d.provenance.history_sample_count }} 个已记录交易日</span>
        </div>
        <div class="metric-grid">
          <Metric label="连续正溢价" :value="`${d.premium.persistence.consecutive_positive_sessions} 日`" />
          <Metric label="5 日溢价区间" :value="rangeText(d.premium.persistence.five_session)" />
          <Metric label="20 日溢价区间" :value="rangeText(d.premium.persistence.twenty_session)" />
        </div>
        <div v-if="premiumPath" class="premium-chart" aria-label="最近二十个交易日溢价走势">
          <svg viewBox="0 0 640 150" role="img">
            <line x1="0" x2="640" :y1="zeroLine" :y2="zeroLine" class="zero-line" />
            <polyline :points="premiumPath" class="premium-line" fill="none" />
          </svg>
          <div class="chart-range"><span>{{ history[0]?.session_date }}</span><span>{{ history.at(-1)?.session_date }}</span></div>
        </div>
        <Unavailable v-else message="历史观察不足，尚不能判断溢价持续性。" />
      </section>

      <section class="detail-band split-band">
        <div>
          <div class="section-heading"><div><div class="eyebrow">Exit Capacity</div><h3>成交与退出容量</h3></div></div>
          <div class="metric-grid compact">
            <Metric label="当日成交额" :value="formatWan(d.liquidity.current_turnover)" />
            <Metric label="当日成交量" :value="formatWan(d.liquidity.current_volume)" />
            <Metric label="5 日均成交额" :value="averageText(d.liquidity.five_session)" />
            <Metric label="20 日均成交额" :value="averageText(d.liquidity.twenty_session)" />
          </div>
        </div>
        <div>
          <div class="section-heading"><div><div class="eyebrow">Execution Evidence</div><h3>申购与交割</h3></div></div>
          <dl class="evidence-list">
            <div><dt>申购状态</dt><dd>{{ d.execution.subscription_open ? '开放' : '未核验或关闭' }}</dd></div>
            <div><dt>单账户限额</dt><dd>{{ d.execution.subscription_limit ?? '暂缺' }}</dd></div>
            <div><dt>可转托管</dt><dd>{{ d.execution.custody_transfer ? '是' : '未核验' }}</dd></div>
            <div><dt>预计可卖日期</dt><dd>{{ d.execution.expected_sell_date || '暂缺' }}</dd></div>
          </dl>
        </div>
      </section>

      <section class="detail-band split-band">
        <div>
          <div class="section-heading"><div><div class="eyebrow">Portfolio Exposure</div><h3>基金组合持仓</h3></div></div>
          <template v-if="d.holdings.available">
            <div class="holding-meta">披露日期 {{ d.holdings.as_of }}<span v-if="d.holdings.concentration_pct != null">前十大集中度 {{ d.holdings.concentration_pct }}%</span></div>
            <el-table :data="d.holdings.top_holdings" size="small" class="holdings-table">
              <el-table-column prop="name" label="持仓名称" min-width="150" />
              <el-table-column prop="weight_pct" label="权重" width="90" align="right"><template #default="{ row }">{{ row.weight_pct }}%</template></el-table-column>
            </el-table>
          </template>
          <Unavailable v-else :message="d.holdings.reason" />
        </div>
        <div>
          <div class="section-heading"><div><div class="eyebrow">Settlement Risk</div><h3>波动风险</h3></div></div>
          <div class="metric-grid compact">
            <Metric label="5 日价格波动" :value="volText(d.volatility.five_session, 'price_return_std_pct')" />
            <Metric label="5 日净值波动" :value="volText(d.volatility.five_session, 'nav_return_std_pct')" />
            <Metric label="5 日溢价波动" :value="volText(d.volatility.five_session, 'premium_std_pct')" />
            <Metric label="20 日溢价区间" :value="volText(d.volatility.twenty_session, 'premium_range_pct')" />
          </div>
          <p class="risk-note">风险指标基于已记录行情，反映结算窗口中的价格、净值与溢价变动，不构成收益或成交保证。</p>
        </div>
      </section>
    </template>

    <el-empty v-else-if="!loading" description="未找到 LOF 详情">
      <el-button type="primary" @click="router.push('/lof')">返回 LOF 列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Star, StarFilled } from '@element-plus/icons-vue'
import { lofApi } from '@/api/lof'
import { useUserStore } from '@/stores/user'
import ExchangeBadge from '@/components/ExchangeBadge.vue'
import TimeStamp from '@/components/TimeStamp.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const detail = ref(null)
const loading = ref(true)
const d = computed(() => detail.value)
const isFavorite = computed(() => userStore.isFavorite('lof', route.params.code))
const history = computed(() => d.value?.premium?.observations || [])

const Metric = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () => h('div', { class: 'metric' }, [h('span', props.label), h('strong', props.value || '暂缺')])
  }
})

const Unavailable = defineComponent({
  props: { message: String },
  setup(props) {
    return () => h('p', { class: 'unavailable' }, props.message || '数据暂缺。')
  }
})

const statusLabel = computed(() => d.value?.strategy_status === 'executable_candidate' ? '可研究候选' : '观察中')
const statusType = computed(() => d.value?.strategy_status === 'executable_candidate' ? 'success' : 'warning')
const premiumPath = computed(() => {
  const rows = history.value
  if (rows.length < 2) return ''
  const values = rows.map(row => row.premium)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  return values.map((value, index) => `${(index / (values.length - 1)) * 640},${140 - ((value - min) / span) * 130}`).join(' ')
})
const zeroLine = computed(() => {
  const values = history.value.map(row => row.premium)
  if (values.length < 2) return 140
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  return 140 - ((0 - min) / (max - min || 1)) * 130
})

onMounted(async () => {
  try {
    detail.value = await lofApi.detail(route.params.code)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})

function toggleFavorite() {
  userStore.toggleFavorite('lof', route.params.code, d.value?.instrument.name)
}
function fixed(value, digits = 3) { return value == null ? '暂缺' : Number(value).toFixed(digits) }
function signedPct(value) { return value == null ? '暂缺' : `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%` }
function formatWan(value) { return value == null || value <= 0 ? '暂缺' : `${Number(value).toFixed(2)} 万` }
function rangeText(window) { return window?.available ? `${window.premium_min_pct.toFixed(2)}% - ${window.premium_max_pct.toFixed(2)}%` : '历史不足' }
function averageText(window) { return window?.available ? formatWan(window.average_turnover) : '历史不足' }
function volText(window, field) { return window?.available && window[field] != null ? `${Number(window[field]).toFixed(2)}%` : '历史不足' }
</script>

<style lang="scss" scoped>
.lof-detail-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; gap: 12px; min-height: 48px; }
.identity { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.identity-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.identity h2 { margin: 0; font-size: 20px; letter-spacing: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.code, .eyebrow, .section-heading > span, .assumption-line, .holding-meta { color: var(--text-color-secondary); font-size: 12px; }
.favorite { color: var(--el-color-warning); }
.decision-band { border-bottom: 1px solid var(--el-border-color); padding: 20px 0 16px; }
.decision-summary { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(150px, .45fr)); gap: 18px; align-items: end; }
.eyebrow { text-transform: uppercase; letter-spacing: 0; margin-bottom: 5px; }
.status-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 13px; color: var(--text-color-secondary); }
.primary-metric { border-left: 3px solid var(--el-color-danger); padding-left: 12px; display: grid; gap: 5px; }
.primary-metric:nth-child(3) { border-color: var(--el-color-primary); }
.primary-metric span, .metric span { color: var(--text-color-secondary); font-size: 12px; }
.primary-metric strong { font-size: 28px; line-height: 1; color: var(--el-color-danger); }
.primary-metric strong.negative { color: var(--el-color-success); }
.assumption-line { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 16px; }
.detail-band { padding: 24px 0; border-bottom: 1px solid var(--el-border-color); }
.split-band { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
.section-heading { display: flex; justify-content: space-between; align-items: end; margin-bottom: 16px; gap: 12px; }
.section-heading h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.metric-grid.compact { grid-template-columns: repeat(2, 1fr); }
.metric { min-height: 62px; border-left: 2px solid var(--el-border-color); padding: 4px 0 4px 10px; display: grid; align-content: space-between; gap: 8px; }
.metric strong { font-size: 17px; font-weight: 650; }
.premium-chart { margin-top: 20px; background: var(--el-fill-color-lighter); padding: 12px; }
.premium-chart svg { width: 100%; height: 160px; display: block; }
.premium-line { stroke: var(--el-color-danger); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.zero-line { stroke: var(--el-border-color); stroke-dasharray: 4 4; }
.chart-range { display: flex; justify-content: space-between; color: var(--text-color-secondary); font-size: 12px; }
.unavailable { padding: 16px 0; color: var(--text-color-secondary); font-size: 13px; margin: 0; }
.evidence-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 20px; margin: 0; }
.evidence-list div { display: grid; gap: 4px; }
.evidence-list dt { color: var(--text-color-secondary); font-size: 12px; }
.evidence-list dd { margin: 0; font-size: 14px; }
.holding-meta { display: flex; gap: 14px; margin-bottom: 10px; }
.holdings-table { --el-table-border-color: var(--el-border-color-lighter); }
.risk-note { color: var(--text-color-secondary); font-size: 12px; line-height: 1.6; margin: 16px 0 0; }
@media (max-width: 768px) {
  .identity { align-items: flex-start; flex-direction: column; gap: 4px; }
  .decision-summary, .split-band { grid-template-columns: 1fr; gap: 18px; }
  .metric-grid, .metric-grid.compact { grid-template-columns: repeat(2, 1fr); }
  .primary-metric strong { font-size: 24px; }
}
</style>
