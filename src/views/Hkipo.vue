<template>
  <div class="page-container hkipo-page">
    <div class="page-header page-header-flex">
      <h2>新股申购</h2>
      <TierBadge :tier="store.tier" :threshold="store.threshold" />
      <el-input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索名称/代码/申购代码"
        clearable
        :prefix-icon="Search"
        size="default"
      />
    </div>

    <!-- 市场概览 -->
    <div class="market-overview" v-loading="store.loading && !store.summary">
      <div class="overview-header">
        <span class="overview-title">市场概览</span>
        <TimeStamp v-if="store.lastUpdated" :time="store.lastUpdated" :stale-after="30" />
      </div>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value hl">{{ summary?.upcoming_count ?? '--' }}</div>
          <div class="overview-label">申购中</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ pendingCount }}</div>
          <div class="overview-label">待上市</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.recent_count ?? '--' }}</div>
          <div class="overview-label">近期上市</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.total ?? '--' }}</div>
          <div class="overview-label">总计</div>
        </div>
      </div>
    </div>

    <!-- Tab 栏 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="tab-count" :class="{ hot: tab.key === 'upcoming' }">{{ tabStats[tab.key] }}</span>
      </button>
    </div>

    <el-alert
      class="guide-alert"
      :title="guideText"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 策略沙盘：PE 估值敏感度 -->
    <el-card v-if="appStore.showSandbox" class="sandbox-card" shadow="never">
      <template #header>
        <div class="sandbox-header" @click="sandboxOpen = !sandboxOpen">
          <span class="sandbox-title">策略沙盘 · PE 估值分析</span>
          <el-icon class="sandbox-toggle" :class="{ expanded: sandboxOpen }"><ArrowDown /></el-icon>
        </div>
      </template>
      <transition name="expand">
        <div v-show="sandboxOpen" class="sandbox-body">
          <div class="sandbox-sliders">
            <SensitivitySlider
              v-model="sandbox.peRatio"
              label="发行 PE"
              :min="5"
              :max="60"
              :step="0.5"
            />
            <SensitivitySlider
              v-model="sandbox.industryPe"
              label="行业 PE"
              :min="5"
              :max="60"
              :step="0.5"
            />
            <SensitivitySlider
              v-model="sandbox.amount"
              label="申购金额"
              :min="1000"
              :max="100000"
              :step="1000"
              :format-fn="v => (v / 10000).toFixed(1) + ' 万'"
            />
          </div>
          <div class="sandbox-result">
            <div class="result-row">
              <span class="result-label">PE 差值</span>
              <span class="result-value" :class="{ positive: sandboxPeDiff < 0, negative: sandboxPeDiff > 5 }">
                {{ sandboxPeDiff > 0 ? '+' : '' }}{{ sandboxPeDiff.toFixed(1) }}
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">估值评级</span>
              <el-tag :type="sandboxRating.type" size="small" effect="light">{{ sandboxRating.label }}</el-tag>
            </div>
            <div class="result-tip">
              <span v-if="sandboxPeDiff < 0" style="color: var(--el-color-success)">发行 PE 低于行业，有安全边际</span>
              <span v-else-if="sandboxPeDiff <= 5">估值合理，接近行业均值</span>
              <span v-else style="color: var(--el-color-danger)">发行 PE 偏高，注意溢价风险</span>
            </div>
          </div>
        </div>
      </transition>
    </el-card>

    <!-- 桌面表格 -->
    <el-table
      class="desktop-table"
      :data="pagedList"
      v-loading="store.loading"
      stripe
      @row-click="goDetail"
    >
      <el-table-column label="股票" min-width="200">
        <template #default="{ row }">
          <div class="name-cell">
            <div class="name-line">
              <span class="bond-name">{{ row.name }}</span>
              <el-icon class="fav-icon" :class="{ active: row.isFavorite }" @click.stop="toggleFav(row)">
                <StarFilled v-if="row.isFavorite" /><Star v-else />
              </el-icon>
            </div>
            <div class="code-line">
              <span class="code-text">{{ row.code }}</span>
              <span class="code-sep" v-if="row.applyCode">|</span>
              <span class="code-sub" v-if="row.applyCode">申购码 {{ row.applyCode }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="发行价" width="100" align="right">
        <template #default="{ row }">
          <span v-if="row.ipoPrice > 0" class="hl">{{ formatNumber(row.ipoPrice) }}</span>
          <span v-else class="text-muted">待定</span>
        </template>
      </el-table-column>
      <el-table-column label="顶格市值" width="110" align="right">
        <template #default="{ row }">{{ row.topValue > 0 ? formatNumber(row.topValue) + '万' : '--' }}</template>
      </el-table-column>
      <el-table-column label="估值" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.peRating.type" size="small" effect="light">{{ row.peRating.label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="中签率" width="90" align="right">
        <template #default="{ row }">
          <span v-if="row.winRate !== ''">{{ row.winRate }}%</span>
          <span v-else class="text-muted">--</span>
        </template>
      </el-table-column>
      <el-table-column label="首日涨幅" width="100" align="right" v-if="activeTab === 'listed'">
        <template #default="{ row }">
          <span v-if="row.firstDayGain" class="text-success">{{ row.firstDayGain }}</span>
          <span v-else class="text-muted">--</span>
        </template>
      </el-table-column>
      <el-table-column label="连板" width="80" align="center" v-if="activeTab === 'listed'">
        <template #default="{ row }">
          <span v-if="row.continuousDays">{{ row.continuousDays }}天</span>
          <span v-else class="text-muted">--</span>
        </template>
      </el-table-column>
      <el-table-column label="日期" width="130">
        <template #default="{ row }">
          <div class="date-cell">
            <span v-if="row.applyDate">申购 {{ row.applyDate }}</span>
            <span v-if="row.payDate">缴款 {{ row.payDate }}</span>
            <span v-if="row.listDate">上市 {{ row.listDate }}</span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 移动端卡片 -->
    <div class="mobile-cards" v-loading="store.loading">
      <el-card
        v-for="item in pagedList"
        :key="item.code"
        class="mobile-card"
        shadow="hover"
        @click="goDetail(item)"
      >
        <div class="mc-head">
          <span class="bond-name">{{ item.name }}</span>
          <el-tag :type="item.peRating.type" size="small" effect="light">{{ item.peRating.label }}</el-tag>
          <el-icon class="fav-icon mc-fav" :class="{ active: item.isFavorite }" @click.stop="toggleFav(item)">
            <StarFilled v-if="item.isFavorite" /><Star v-else />
          </el-icon>
        </div>
        <div class="mc-code">
          <span>{{ item.code }}</span>
          <span v-if="item.applyCode" class="code-sub">申购码 {{ item.applyCode }}</span>
        </div>
        <div class="mc-metrics">
          <div class="mc-metric">
            <span class="mc-label">发行价</span>
            <span v-if="item.ipoPrice > 0" class="hl">{{ formatNumber(item.ipoPrice) }}</span>
            <span v-else>待定</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">顶格</span>
            {{ item.topValue > 0 ? formatNumber(item.topValue) + '万' : '--' }}
          </div>
          <div class="mc-metric" v-if="item.winRate !== ''">
            <span class="mc-label">中签率</span>
            {{ item.winRate }}%
          </div>
          <div class="mc-metric" v-if="item.firstDayGain">
            <span class="mc-label">首日</span>
            <span class="text-success">{{ item.firstDayGain }}</span>
          </div>
        </div>
        <div class="mc-date" v-if="item.applyDate || item.listDate">
          <span v-if="item.applyDate">申购 {{ item.applyDate }}</span>
          <span v-if="item.listDate">上市 {{ item.listDate }}</span>
        </div>
      </el-card>
      <el-empty v-if="!store.loading && pagedList.length === 0" description="暂无数据" />
    </div>

    <!-- 公式回忆（检索练习） -->
    <FormulaRecall :items="recallItems" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Star, StarFilled, ArrowDown } from '@element-plus/icons-vue'
import { useHkipoStore } from '@/stores/hkipo'
import { useUserStore } from '@/stores/user'
import { formatNumber } from '@/utils/format'
import TierBadge from '@/components/TierBadge.vue'
import TimeStamp from '@/components/TimeStamp.vue'
import SensitivitySlider from '@/components/SensitivitySlider.vue'
import FormulaRecall from '@/components/FormulaRecall.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const router = useRouter()
const store = useHkipoStore()
const userStore = useUserStore()

const activeTab = ref('upcoming')
const searchKeyword = ref('')
const isMobile = ref(false)

// 策略沙盘
const sandboxOpen = ref(false)
const sandbox = ref({ peRatio: 20, industryPe: 25, amount: 10000 })
const sandboxPeDiff = computed(() => sandbox.value.peRatio - sandbox.value.industryPe)
const sandboxRating = computed(() => {
  const diff = sandboxPeDiff.value
  if (diff < 0) return { label: '低估', type: 'success' }
  if (diff <= 5) return { label: '合理', type: 'warning' }
  return { label: '偏高', type: 'danger' }
})

// 公式回忆
const recallItems = [
  { prompt: '一手成本 = ____ × 每手股数', answer: '申购价', placeholder: '缺失的项' },
  { prompt: 'PE 差 = ____ - 行业平均 PE', answer: '发行 PE', placeholder: '缺失的项' },
]

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'upcoming', label: '申购中' },
  { key: 'pending', label: '待上市' },
  { key: 'listed', label: '已上市' }
]

const guideTextMap = {
  all: '全部新股列表。关注低估标的（PE 差 < 0）和高中签率机会。',
  upcoming: '正在申购的新股。发行 PE 低于行业 PE 有安全边际，顶格市值越低资金占用越少。',
  pending: '已申购待上市的新股。关注上市首日表现预期。',
  listed: '已上市新股。关注首日涨幅和连板天数，评估打新收益。'
}

const guideText = computed(() => guideTextMap[activeTab.value])

// 合并列表（去重）
const allList = computed(() => {
  const seen = new Set()
  const result = []
  for (const item of [...store.upcomingList, ...store.ipoList]) {
    if (!seen.has(item.code)) {
      seen.add(item.code)
      result.push(item)
    }
  }
  return result
})

const pendingCount = computed(() => {
  return allList.value.filter(i => i.status === 'pending').length
})

// 按 Tab 过滤
const filteredByTab = computed(() => {
  const list = allList.value
  if (activeTab.value === 'upcoming') return list.filter(i => i.status === 'upcoming')
  if (activeTab.value === 'pending') return list.filter(i => i.status === 'pending')
  if (activeTab.value === 'listed') return list.filter(i => i.status === 'listed')
  return list
})

// 搜索过滤
const pagedList = computed(() => {
  let list = filteredByTab.value
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(i =>
      i.name.toLowerCase().includes(kw) ||
      i.code.includes(kw) ||
      (i.applyCode || '').includes(kw)
    )
  }
  return list
})

// Tab 计数
const tabStats = computed(() => {
  const list = allList.value
  return {
    all: list.length,
    upcoming: list.filter(i => i.status === 'upcoming').length,
    pending: list.filter(i => i.status === 'pending').length,
    listed: list.filter(i => i.status === 'listed').length
  }
})

const summary = computed(() => store.summary)

function toggleFav(row) {
  userStore.toggleFavorite('hkipo', row.code, row.name)
  store.refreshFavorites()
  ElMessage.success(userStore.isFavorite('hkipo', row.code) ? '已添加自选' : '已取消自选')
}

function goDetail(row) {
  if (!row?.code) return
  router.push(`/hkipo/${row.code}`)
}

let mql
function updateMobile(e) { isMobile.value = e.matches }

onMounted(() => {
  store.loadAll()
  mql = window.matchMedia('(max-width: 768px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', updateMobile)
})

onActivated(() => {
  store.refreshFavorites()
})

onUnmounted(() => {
  if (mql) mql.removeEventListener('change', updateMobile)
})
</script>

<style lang="scss" scoped>
.hkipo-page {
  .page-header-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    .search-input {
      max-width: 280px;
    }
  }

  .market-overview {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    .overview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .overview-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color);
      }
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .overview-item {
      text-align: center;

      .overview-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.2;

        &.hl {
          color: var(--el-color-danger);
        }
      }

      .overview-label {
        font-size: 12px;
        color: var(--text-color-secondary);
        margin-top: 4px;
      }
    }
  }

  .tab-bar {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 12px;
    flex-wrap: wrap;

    .tab-btn {
      position: relative;
      padding: 8px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-color-secondary);
      font-size: 14px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;

      &:hover { color: var(--el-color-primary); }

      &.active {
        color: var(--el-color-primary);
        border-bottom-color: var(--el-color-primary);
        font-weight: 600;
      }

      .tab-count {
        display: inline-block;
        min-width: 18px;
        padding: 0 6px;
        height: 18px;
        line-height: 18px;
        border-radius: 9px;
        background: var(--el-fill-color);
        color: var(--text-color-secondary);
        font-size: 11px;
        text-align: center;

        &.hot { background: var(--el-color-danger); color: #fff; }
      }
    }
  }

  .guide-alert {
    margin-bottom: 12px;
  }

  .sandbox-card {
    margin-bottom: 12px;

    .sandbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;

      .sandbox-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);
      }

      .sandbox-toggle {
        transition: transform 0.2s;
        color: var(--text-color-secondary);

        &.expanded {
          transform: rotate(180deg);
        }
      }
    }

    .sandbox-body {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;

      .sandbox-sliders {
        flex: 1;
        min-width: 240px;
      }

      .sandbox-result {
        min-width: 200px;
        padding: 12px 16px;
        background: var(--bg-color);
        border-radius: 8px;

        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;

          .result-label {
            font-size: 13px;
            color: var(--text-color-secondary);
          }

          .result-value {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-color);

            &.positive {
              color: var(--el-color-success);
            }

            &.negative {
              color: var(--el-color-danger);
            }
          }
        }

        .result-tip {
          font-size: 12px;
          color: var(--text-color-secondary);
          margin-top: 4px;
        }
      }
    }
  }

  .expand-enter-active, .expand-leave-active {
    transition: all 0.2s ease;
  }

  .expand-enter-from, .expand-leave-to {
    opacity: 0;
    max-height: 0;
  }

  .name-cell {
    .name-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .code-line {
      margin-top: 2px;
      font-size: 12px;
      color: var(--text-color-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .bond-name { font-weight: 600; color: var(--text-color); }
    .code-text { color: var(--text-color-secondary); }
    .code-sub { color: var(--text-color-secondary); font-size: 11px; }
    .code-sep { color: var(--el-border-color); }
  }

  .date-cell {
    display: flex;
    flex-direction: column;
    font-size: 12px;
    color: var(--text-color-secondary);
    gap: 2px;
  }

  .fav-icon {
    cursor: pointer;
    color: var(--el-border-color);
    font-size: 16px;
    &.active { color: #fadb14; }
    &:hover { color: #fadb14; }
  }

  .hl { color: var(--el-color-primary); font-weight: 600; }
  .text-muted { color: var(--text-color-secondary); font-size: 13px; }
  .text-success { color: var(--el-color-success); font-weight: 600; }

  .desktop-table {
    cursor: pointer;
  }

  .mobile-cards {
    display: none;
  }

  /* 响应式 */
  @media (max-width: 768px) {
    .page-header-flex {
      flex-direction: column;
      align-items: stretch;
      .search-input { max-width: 100%; }
    }

    .market-overview .overview-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .desktop-table { display: none; }
    .mobile-cards {
      display: block;

      .mobile-card {
        margin-bottom: 10px;
        cursor: pointer;
      }

      .mc-head {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        .bond-name { font-weight: 600; }
        .mc-fav { margin-left: auto; }
      }

      .mc-code {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-color-secondary);
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .mc-metrics {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        font-size: 13px;

        .mc-label {
          display: inline-block;
          min-width: 48px;
          color: var(--text-color-secondary);
          margin-right: 4px;
        }
      }

      .mc-date {
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-color-secondary);
        display: flex;
        gap: 8px;
      }
    }
  }
}
</style>
