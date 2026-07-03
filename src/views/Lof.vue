<template>
  <div class="page-container lof-page">
    <div class="page-header page-header-flex">
      <h2>LOF 基金套利</h2>
      <el-input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索基金名称/代码"
        clearable
        :prefix-icon="Search"
        size="default"
      />
    </div>

    <!-- 市场概览 -->
    <div class="market-overview" v-loading="store.loading && !store.summary">
      <div class="overview-header">
        <span class="overview-title">市场概览</span>
      </div>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value">{{ summary?.count ?? '--' }}</div>
          <div class="overview-label">基金数量</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ formatPremiumNum(summary?.premium_avg) }}</div>
          <div class="overview-label">平均溢价</div>
        </div>
        <div class="overview-item">
          <div class="overview-value hl">{{ formatPremiumNum(summary?.top_premium) }}</div>
          <div class="overview-label">最高溢价</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.positive_count ?? '--' }}</div>
          <div class="overview-label">溢价数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.paused_count ?? '--' }}</div>
          <div class="overview-label">暂停数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.arbitrage_count ?? '--' }}</div>
          <div class="overview-label">可套利</div>
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
        <span class="tab-count" :class="{ hot: tab.key === 'premium' }">{{ tabStats[tab.key] }}</span>
      </button>
    </div>

    <el-alert
      class="guide-alert"
      :title="guideText"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 桌面表格 -->
    <el-table
      class="desktop-table"
      :data="pagedList"
      v-loading="store.loading"
      stripe
      @row-click="openDetail"
      :row-class-name="rowClassName"
    >
      <el-table-column label="基金" min-width="200">
        <template #default="{ row }">
          <div class="name-cell">
            <div class="name-line">
              <span class="exchange-badge" :class="exchangeClass(row.exchange)">{{ row.exchange }}</span>
              <span class="fund-name">{{ row.name }}</span>
            </div>
            <div class="code-line">
              <span class="code-text">{{ row.code }}</span>
              <span class="code-sep">|</span>
              <span class="code-change" :class="row.isChangeUp ? 'up' : 'down'">{{ row.changePctText }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="现价/净值" width="150" align="right">
        <template #default="{ row }">
          <div class="price-cell">
            <span class="hl">{{ row.priceText }}</span>
            <span class="price-sub">{{ row.valuationText }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="溢价率" width="110" align="right" sortable :sort-by="'premium'">
        <template #default="{ row }">
          <span
            class="premium-value"
            :class="{ negative: row.premium < 0, high: row.isHighPremium }"
          >{{ row.premiumText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="净溢价" width="110" align="right">
        <template #default="{ row }">
          <span
            class="premium-value"
            :class="{ negative: row.netPremiumClass === 'negative', high: row.netPremiumClass === 'high' }"
          >{{ row.netPremiumText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="连续溢价" width="90" align="center">
        <template #default="{ row }">
          <span :class="{ hl: row.sustainedPremium }">{{ row.consecutivePremium }}天</span>
        </template>
      </el-table-column>
      <el-table-column label="成交额" width="110" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row)">{{ row.amountText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="申购状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.limitStatus)" size="small" effect="light">{{ row.limitStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标记" width="160">
        <template #default="{ row }">
          <div class="tag-group">
            <el-tag v-if="row.canArbitrage" type="success" size="small" effect="dark">可套利</el-tag>
            <el-tag v-if="row.sustainedPremium" type="primary" size="small" effect="plain">溢价持续</el-tag>
            <el-tag v-if="row.lowLiquidity" type="warning" size="small" effect="plain">流动性差</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="自选" width="60" align="center">
        <template #default="{ row }">
          <el-icon class="fav-icon" :class="{ active: row.isFavorite }" @click.stop="toggleFav(row)">
            <StarFilled v-if="row.isFavorite" />
            <Star v-else />
          </el-icon>
        </template>
      </el-table-column>
    </el-table>

    <!-- 移动卡片流 -->
    <div class="mobile-cards" v-loading="store.loading">
      <el-card
        v-for="row in pagedList"
        :key="row.code"
        class="mobile-card"
        shadow="hover"
        :class="{ 'row-highlight': row.isHighlight }"
        @click="openDetail(row)"
      >
        <div class="mc-head">
          <span class="exchange-badge" :class="exchangeClass(row.exchange)">{{ row.exchange }}</span>
          <span class="fund-name">{{ row.name }}</span>
          <el-icon class="fav-icon mc-fav" :class="{ active: row.isFavorite }" @click.stop="toggleFav(row)">
            <StarFilled v-if="row.isFavorite" />
            <Star v-else />
          </el-icon>
        </div>
        <div class="mc-code">
          <span>{{ row.code }}</span>
          <span class="code-change" :class="row.isChangeUp ? 'up' : 'down'">{{ row.changePctText }}</span>
          <el-tag :type="statusTagType(row.limitStatus)" size="small" effect="light">{{ row.limitStatus }}</el-tag>
        </div>
        <div class="mc-metrics">
          <div class="mc-metric">
            <span class="mc-label">现价</span>
            <span class="hl">{{ row.priceText }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">溢价率</span>
            <span
              class="premium-value"
              :class="{ negative: row.premium < 0, high: row.isHighPremium }"
            >{{ row.premiumText }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">净溢价</span>
            <span
              class="premium-value"
              :class="{ negative: row.netPremiumClass === 'negative', high: row.netPremiumClass === 'high' }"
            >{{ row.netPremiumText }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">连续溢价</span>
            <span :class="{ hl: row.sustainedPremium }">{{ row.consecutivePremium }}天</span>
          </div>
        </div>
        <div class="mc-tags" v-if="row.canArbitrage || row.sustainedPremium || row.lowLiquidity">
          <el-tag v-if="row.canArbitrage" type="success" size="small" effect="dark">可套利</el-tag>
          <el-tag v-if="row.sustainedPremium" type="primary" size="small" effect="plain">溢价持续</el-tag>
          <el-tag v-if="row.lowLiquidity" type="warning" size="small" effect="plain">流动性差</el-tag>
        </div>
      </el-card>
      <el-empty v-if="!store.loading && pagedList.length === 0" description="暂无数据" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="detailData ? `${detailData.name} (${detailData.code})` : '详情'"
      :fullscreen="isMobile"
      width="600px"
      @close="detailData = null"
    >
      <template v-if="detailData">
        <!-- 基金概要 -->
        <div class="detail-section">
          <div class="detail-section-title">基金概要</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">交易所</span>
              <span class="detail-value">{{ detailData.exchange || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申购状态</span>
              <span class="detail-value">{{ detailData.limitStatus || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申购限额</span>
              <span class="detail-value">{{ detailData.limitAmount != null ? detailData.limitAmount + '元' : '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">赎回规则</span>
              <span class="detail-value">{{ detailData.exchange === '深' ? 'T+1可赎' : '当天可赎' }}</span>
            </div>
          </div>
        </div>

        <!-- 价格与净值 -->
        <div class="detail-section">
          <div class="detail-section-title">价格与净值</div>
          <div class="detail-grid">
            <div class="detail-item hl-box">
              <span class="detail-label">当前价</span>
              <span class="detail-value">{{ detailData.priceText }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">基金净值</span>
              <span class="detail-value">{{ detailData.valuationText }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">价格偏离</span>
              <span class="detail-value">{{ detailData.spread }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">毛溢价率</span>
              <span class="detail-value">{{ detailData.premiumText }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">净溢价(扣费后)</span>
              <span
                class="detail-value"
                :class="{ negative: detailData.netPremiumClass === 'negative', high: detailData.netPremiumClass === 'high' }"
              >{{ detailData.netPremiumText }}</span>
            </div>
          </div>
        </div>

        <!-- 流动性数据 -->
        <div class="detail-section">
          <div class="detail-section-title">流动性数据</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">成交额</span>
              <span class="detail-value">{{ detailData.amountText }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">成交量</span>
              <span class="detail-value">{{ detailData.volumeText }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">连续溢价</span>
              <span class="detail-value" :class="{ hl: detailData.sustainedPremium }">{{ detailData.consecutivePremium }}天</span>
            </div>
          </div>
        </div>

        <!-- 操作建议 -->
        <div class="detail-section">
          <div class="detail-section-title">操作建议</div>
          <div class="advice-box">{{ detailData.advice }}</div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Star, StarFilled } from '@element-plus/icons-vue'
import { useLofStore } from '@/stores/lof'
import { useUserStore } from '@/stores/user'

const store = useLofStore()
const userStore = useUserStore()

const activeTab = ref('all')
const searchKeyword = ref('')
const detailVisible = ref(false)
const detailData = ref(null)
const isMobile = ref(false)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'premium', label: '溢价≥5%' },
  { key: 'discount', label: '折价' },
  { key: 'paused', label: '暂停' }
]

const guideTextMap = {
  all: '全部 LOF 基金列表，按溢价率降序排列。关注高溢价且成交活跃的标的。',
  premium: '溢价≥5% 的基金，具备申购套利潜力。注意流动性风险与净值波动。',
  discount: '折价基金，可考虑持有套利（需≥7天，赎回费0.5%）。注意净值波动。',
  paused: '申购暂停的基金，无法套利。关注恢复申购后的溢价变化。'
}

const guideText = computed(() => guideTextMap[activeTab.value])

// 按 Tab 过滤
const filteredByTab = computed(() => {
  const list = store.fundList
  if (activeTab.value === 'premium') return list.filter(i => i.premiumValue >= 5)
  if (activeTab.value === 'discount') return list.filter(i => i.premiumValue < 0)
  if (activeTab.value === 'paused') return list.filter(i => i.isPaused)
  return list
})

// 搜索过滤
const pagedList = computed(() => {
  let list = filteredByTab.value
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(i =>
      i.name.toLowerCase().includes(kw) || i.code.toLowerCase().includes(kw)
    )
  }
  return list
})

// Tab 计数
const tabStats = computed(() => {
  const list = store.fundList
  return {
    all: list.length,
    premium: list.filter(i => i.premiumValue >= 5).length,
    discount: list.filter(i => i.premiumValue < 0).length,
    paused: list.filter(i => i.isPaused).length
  }
})

const summary = computed(() => store.summary)

function formatPremiumNum(val) {
  if (val == null || val === '--' || isNaN(val)) return '--'
  return Number(val).toFixed(2) + '%'
}

function openDetail(row) {
  detailData.value = row
  detailVisible.value = true
}

function toggleFav(row) {
  userStore.toggleFavorite('lof', row.code, row.name)
  row.isFavorite = userStore.isFavorite('lof', row.code)
  ElMessage.success(row.isFavorite ? '已添加自选' : '已取消自选')
}

function statusTagType(status) {
  if (status === '暂停') return 'danger'
  if (status === '限100') return 'warning'
  return 'success'
}

function exchangeClass(ex) {
  if (ex === '沪') return 'ex-sh'
  if (ex === '深') return 'ex-sz'
  if (ex === '京') return 'ex-bj'
  return ''
}

function amountClass(row) {
  if (row.amountLevel === 'danger') return 'negative'
  if (row.amountLevel === 'warn') return 'warning'
  return ''
}

function rowClassName({ row }) {
  return row.isHighlight ? 'row-highlight' : ''
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
.lof-page {
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
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
    }

    .overview-item {
      text-align: center;

      .overview-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.2;
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

    .fund-name { font-weight: 600; color: var(--text-color); }
    .code-text { color: var(--text-color-secondary); }
    .code-change {
      &.up { color: var(--el-color-danger); }
      &.down { color: var(--el-color-success); }
    }
    .code-sep { color: var(--el-border-color); }
  }

  .price-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .exchange-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 11px;
    color: #fff;

    &.ex-sh { background: #d4380d; }
    &.ex-sz { background: #0958d9; }
    &.ex-bj { background: #531dab; }
  }

  .fav-icon {
    cursor: pointer;
    color: var(--el-border-color);
    font-size: 16px;
    &.active { color: #fadb14; }
    &:hover { color: #fadb14; }
  }

  .tag-group {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .hl { color: var(--el-color-primary); font-weight: 600; }
  .price-sub { font-size: 12px; color: var(--text-color-secondary); }

  .premium-value {
    &.negative { color: var(--el-color-success); }
    &.high { color: var(--el-color-danger); }
  }

  .warning { color: var(--el-color-warning); font-weight: 600; }
  .negative { color: var(--el-color-danger); font-weight: 600; }

  .mobile-cards {
    display: none;
  }

  :deep(.row-highlight) {
    background: rgba(245, 108, 108, 0.06);
  }

  /* 详情弹窗 */
  .detail-section {
    margin-bottom: 18px;

    .detail-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
      padding-left: 8px;
      border-left: 3px solid var(--el-color-primary);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    .detail-item {
      background: var(--el-fill-color-light);
      border-radius: 6px;
      padding: 8px 10px;

      &.hl-box {
        background: var(--el-color-primary-light-9);
      }

      .detail-label {
        display: block;
        font-size: 12px;
        color: var(--text-color-secondary);
        margin-bottom: 4px;
      }

      .detail-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);

        &.hl { color: var(--el-color-primary); }
        &.negative { color: var(--el-color-success); }
        &.high { color: var(--el-color-danger); }
      }
    }
  }

  .advice-box {
    background: rgba(103, 194, 58, 0.1);
    border: 1px solid rgba(103, 194, 58, 0.3);
    border-radius: 6px;
    padding: 12px;
    font-size: 13px;
    color: var(--text-color);
    line-height: 1.6;
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
        .fund-name { font-weight: 600; }
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

      .mc-tags {
        margin-top: 6px;
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
    }

    .detail-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 769px) and (max-width: 1199px) {
    .market-overview .overview-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}
</style>
