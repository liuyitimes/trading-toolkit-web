<template>
  <div class="page-container closed-end-page">
    <div class="page-header page-header-flex">
      <h2>封闭式基金折价套利</h2>
      <TierBadge :tier="store.tier" :threshold="store.threshold" />
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
        <TimeStamp v-if="store.lastUpdated" :time="store.lastUpdated" :stale-after="30" />
      </div>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value">{{ summary?.count ?? '--' }}</div>
          <div class="overview-label">基金数量</div>
        </div>
        <div class="overview-item">
          <div class="overview-value" :class="{ hl: parseFloat(summary?.avg_discount) > 0 }">
            {{ formatDiscountStr(summary?.avg_discount) }}
          </div>
          <div class="overview-label">平均折溢价</div>
        </div>
        <div class="overview-item">
          <div class="overview-value hl">{{ summary?.high_discount_count ?? '--' }}</div>
          <div class="overview-label">高折价数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.premium_count ?? '--' }}</div>
          <div class="overview-label">溢价数</div>
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
        <span class="tab-count" :class="{ hot: tab.key === 'discount' || tab.key === 'highDiscount' }">{{ tabStats[tab.key] }}</span>
      </button>
    </div>

    <el-alert
      class="guide-alert"
      title="折溢价套利原理：封闭式基金场内价格与净值存在差异。折价时买入可等待价值回归；溢价时则反映市场情绪，需注意回落风险。"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 桌面表格 -->
    <el-table
      class="desktop-table"
      :data="filteredList"
      v-loading="store.loading"
      stripe
      @row-click="openDetail"
      :row-class-name="rowClassName"
    >
      <el-table-column label="基金" min-width="220">
        <template #default="{ row }">
          <div class="name-cell">
            <div class="name-line">
              <span class="exchange-badge" :class="exchangeClass(row.exchange)">{{ row.exchange }}</span>
              <span class="fund-name">{{ row.name }}</span>
            </div>
            <div class="code-line">
              <span class="code-text">{{ row.code }}</span>
              <span class="code-sep">|</span>
              <span class="code-change" :class="row.changeClass">{{ row.changePct }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="现价/净值" width="140" align="right">
        <template #default="{ row }">
          <div class="price-cell">
            <span class="hl">{{ row.price }}</span>
            <span class="price-sub">{{ row.nav }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column width="120" align="right" sortable :sort-by="'discountRaw'">
        <template #header>
          折价率<FormulaInfo
            formula="(单位净值 - 场内价格) / 单位净值 × 100%"
            example="净值 1.00，价格 0.95 → 折价率 = 5%"
            note="正值表示折价，负值表示溢价"
          />
        </template>
        <template #default="{ row }">
          <span
            class="discount-value"
            :class="row.discountClass"
          >{{ row.discount }}</span>
        </template>
      </el-table-column>
      <el-table-column width="110" align="right">
        <template #header>
          年化折价<FormulaInfo
            formula="年化折价 = 折价率 / 剩余年限"
            example="折价 5%，剩余 2 年 → 年化 2.5%"
            note="便于不同到期日的基金横向比较"
          />
        </template>
        <template #default="{ row }">
          <span class="hover-value">{{ row.annualizedDiscount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="成交额" width="110" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row)">{{ row.amount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="到期日" width="120" v-if="hasMaturity">
        <template #default="{ row }">{{ row.maturityDate || '--' }}</template>
      </el-table-column>
      <el-table-column label="剩余年限" width="100" align="right" v-if="hasMaturity">
        <template #default="{ row }">{{ row.yearsToMaturity }}</template>
      </el-table-column>
      <el-table-column label="标记" width="140">
        <template #default="{ row }">
          <div class="tag-group">
            <el-tag v-if="row.discountRaw >= 5" type="danger" size="small" effect="dark">高折价</el-tag>
            <el-tag v-if="row.discountRaw > 0 && row.discountRaw < 5" type="warning" size="small" effect="plain">折价</el-tag>
            <el-tag v-if="row.discountRaw < 0" type="success" size="small" effect="plain">溢价</el-tag>
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
        v-for="row in filteredList"
        :key="row.code"
        class="mobile-card"
        shadow="hover"
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
          <span class="code-change" :class="row.changeClass">{{ row.changePct }}</span>
        </div>
        <div class="mc-metrics">
          <div class="mc-metric">
            <span class="mc-label">现价</span>
            <span class="hl">{{ row.price }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">净值</span>
            <span>{{ row.nav }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">折价率</span>
            <span
              class="discount-value"
              :class="row.discountClass"
            >{{ row.discount }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">年化</span>
            <span>{{ row.annualizedDiscount }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">成交额</span>
            <span :class="amountClass(row)">{{ row.amount }}</span>
          </div>
          <div class="mc-metric" v-if="row.maturityDate">
            <span class="mc-label">到期</span>
            <span>{{ row.maturityDate }}</span>
          </div>
        </div>
        <div class="mc-tags" v-if="row.discountRaw >= 5 || row.lowLiquidity">
          <el-tag v-if="row.discountRaw >= 5" type="danger" size="small" effect="dark">高折价</el-tag>
          <el-tag v-if="row.lowLiquidity" type="warning" size="small" effect="plain">流动性差</el-tag>
        </div>
      </el-card>
      <el-empty v-if="!store.loading && filteredList.length === 0" description="暂无数据" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :fullscreen="isMobile"
      width="640px"
      class="ce-detail-dialog"
    >
      <template #header>
        <div class="dialog-header-fund">
          <span class="dialog-fund-title" v-if="currentItem">
            {{ currentItem.name }} ({{ currentItem.code }})
          </span>
        </div>
      </template>
      <template v-if="currentItem">
        <!-- 基础信息 -->
        <div class="detail-section">
          <div class="detail-section-title">基础信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">交易所</span>
              <span class="detail-value">{{ currentItem.exchange || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">涨跌幅</span>
              <span class="detail-value" :class="currentItem.changeClass">{{ currentItem.changePct }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">基金类型</span>
              <span class="detail-value">{{ currentItem.type }}</span>
            </div>
          </div>
        </div>

        <!-- 价格与折价 -->
        <div class="detail-section">
          <div class="detail-section-title">价格与折价</div>
          <div class="detail-grid">
            <div class="detail-item hl-box">
              <span class="detail-label">场内价格</span>
              <span class="detail-value hl">{{ currentItem.price }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">单位净值</span>
              <span class="detail-value">{{ currentItem.nav }}</span>
            </div>
            <div class="detail-item" v-if="currentItem.navDate">
              <span class="detail-label">净值日期</span>
              <span class="detail-value">{{ currentItem.navDate }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">折价率</span>
              <span class="detail-value hl" :class="currentItem.discountClass">{{ currentItem.discount }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">年化折价</span>
              <span class="detail-value">{{ currentItem.annualizedDiscount }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">成交额</span>
              <span class="detail-value" :class="amountClass(currentItem)">{{ currentItem.amount }}</span>
            </div>
          </div>
        </div>

        <!-- 到期与规模 -->
        <div class="detail-section" v-if="hasMaturity">
          <div class="detail-section-title">到期与规模</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">到期日</span>
              <span class="detail-value">{{ currentItem.maturityDate || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">剩余年限</span>
              <span class="detail-value">{{ currentItem.yearsToMaturity }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">基金规模</span>
              <span class="detail-value">{{ currentItem.size }}</span>
            </div>
          </div>
        </div>

        <!-- 持仓 -->
        <div class="detail-section" v-if="currentItem.topHoldings?.length">
          <div class="detail-section-title">持仓前十大</div>
          <div class="holdings-tags">
            <el-tag v-for="h in currentItem.topHoldings" :key="h" size="small" effect="plain">{{ h }}</el-tag>
          </div>
        </div>

        <!-- 套利策略 -->
        <el-alert
          class="strategy-alert"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div v-if="currentItem.discountRaw > 0">
              折价买入，持有至到期折价收敛。当前折价 {{ currentItem.discount }}，年化收益 {{ currentItem.annualizedDiscount }}。
            </div>
            <div v-else>
              当前处于溢价状态，折价率 {{ currentItem.discount }}。溢价买入存在回落风险，请谨慎操作。
            </div>
          </template>
        </el-alert>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { Search, Star, StarFilled } from '@element-plus/icons-vue'
import { useClosedEndStore } from '@/stores/closedEnd'
import TierBadge from '@/components/TierBadge.vue'
import TimeStamp from '@/components/TimeStamp.vue'
import FormulaInfo from '@/components/FormulaInfo.vue'

const store = useClosedEndStore()
const searchKeyword = ref('')
const activeTab = ref('all')
const detailVisible = ref(false)
const currentItem = ref(null)
const isMobile = ref(window.matchMedia('(max-width: 768px)').matches)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'discount', label: '折价(>0)' },
  { key: 'highDiscount', label: '高折价(≥5%)' },
  { key: 'premium', label: '溢价(<0)' }
]

const filteredList = computed(() => {
  let list = store.fundList
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(i =>
      i.name.toLowerCase().includes(kw) || i.code.includes(kw)
    )
  }
  switch (activeTab.value) {
    case 'discount':
      return list.filter(i => i.discountRaw > 0)
    case 'highDiscount':
      return list.filter(i => i.discountRaw >= 5)
    case 'premium':
      return list.filter(i => i.discountRaw < 0)
    default:
      return list
  }
})

const tabStats = computed(() => ({
  all: store.fundList.length,
  discount: store.fundList.filter(i => i.discountRaw > 0).length,
  highDiscount: store.fundList.filter(i => i.discountRaw >= 5).length,
  premium: store.fundList.filter(i => i.discountRaw < 0).length
}))

const summary = computed(() => store.summary)

// 是否有任何基金带到期日
const hasMaturity = computed(() => store.fundList.some(i => i.maturityDate))

function formatDiscountStr(val) {
  if (val == null) return '--'
  const num = parseFloat(val)
  return (num > 0 ? '+' : '') + val + '%'
}

function exchangeClass(ex) {
  if (ex === '沪') return 'ex-sh'
  if (ex === '深') return 'ex-sz'
  if (ex === '北') return 'ex-bj'
  return ''
}

function amountClass(row) {
  if (row.amountRaw <= 0) return ''
  if (row.amountRaw < 1e6) return 'low-amount'
  return ''
}

function rowClassName({ row }) {
  if (row.discountRaw >= 5) return 'row-highlight'
  return ''
}

function toggleFav(row) {
  row.isFavorite = !row.isFavorite
}

function openDetail(item) {
  currentItem.value = item
  detailVisible.value = true
}

onMounted(() => {
  if (!store.fundList.length) store.loadAll()
})
onActivated(() => {
  if (!store.fundList.length) store.loadAll()
})
</script>

<style lang="scss" scoped>
.closed-end-page {
  .page-header-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    h2 {
      margin: 0;
      font-size: 20px;
    }

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
        font-size: 22px;
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.2;

        &.hl {
          color: var(--el-color-primary);
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

  /* 桌面表格 */
  .desktop-table {
    .name-cell {
      .name-line {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .code-line {
        margin-top: 2px;
        font-size: 12px;
        color: var(--text-color-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .fund-name { font-weight: 600; color: var(--text-color); }
      .code-text { color: var(--text-color-secondary); }
      .code-change {
        &.up { color: var(--el-color-danger); }
        &.down { color: var(--el-color-success); }
      }
      .code-sep { color: var(--el-border-color); }
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

    .price-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .hl { color: var(--el-color-primary); font-weight: 600; }
    .price-sub { font-size: 12px; color: var(--text-color-secondary); }

    .hover-value {
      cursor: help;
      border-bottom: 1px dashed var(--text-color-secondary);
      padding-bottom: 1px;
    }

    .discount-value {
      font-weight: 600;

      &.high {
        color: var(--el-color-danger);
      }

      &.mid {
        color: var(--el-color-warning);
      }

      &.premium {
        color: var(--el-color-success);
      }
    }

    .low-amount {
      color: var(--el-color-warning);
    }

    .tag-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .fav-icon {
      cursor: pointer;
      color: var(--el-border-color);
      font-size: 16px;
      &.active { color: #fadb14; }
      &:hover { color: #fadb14; }
    }

    .up { color: var(--el-color-danger); }
    .down { color: var(--el-color-success); }
  }

  /* 行高亮 */
  :deep(.row-highlight) {
    td {
      background: rgba(64, 158, 255, 0.04) !important;
    }
  }

  /* 移动卡片 */
  .mobile-cards {
    display: none;
  }

  .mobile-card {
    margin-bottom: 10px;
    cursor: pointer;

    .mc-head {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .fund-name { font-weight: 600; }
    }

    .mc-fav {
      margin-left: auto;
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

    .mc-code {
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-color-secondary);
      display: flex;
      gap: 8px;
      align-items: center;

      .code-change {
        &.up { color: var(--el-color-danger); }
        &.down { color: var(--el-color-success); }
      }
    }

    .mc-metrics {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      font-size: 13px;

      .mc-label {
        display: inline-block;
        min-width: 40px;
        color: var(--text-color-secondary);
        margin-right: 4px;
      }
    }

    .mc-tags {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .discount-value {
      font-weight: 600;

      &.high { color: var(--el-color-danger); }
      &.mid { color: var(--el-color-warning); }
      &.premium { color: var(--el-color-success); }
    }

    .low-amount {
      color: var(--el-color-warning);
    }

    .hl { color: var(--el-color-primary); font-weight: 600; }
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
      }
    }
  }

  .holdings-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .strategy-alert {
    margin-top: 12px;
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
    .mobile-cards { display: block; }

    .detail-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 769px) and (max-width: 1199px) {
    .detail-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
</style>

<style lang="scss">
.dialog-header-fund {
  display: flex;
  align-items: center;
  gap: 10px;

  .dialog-fund-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
