<template>
  <div class="page-container lof-page">
    <div class="page-header page-header-flex">
      <h2>LOF 基金套利</h2>
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
          <div class="overview-value hl">{{ summary?.top_premium_board ?? '--' }}</div>
          <div class="overview-label">溢价最多板块</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ formatPremiumNum(summary?.top_board_premium_avg) }}</div>
          <div class="overview-label">板块平均溢价</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.positive_count ?? '--' }}</div>
          <div class="overview-label">溢价基金数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ summary?.discount_count ?? '--' }}</div>
          <div class="overview-label">折价基金数</div>
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
        <span class="tab-count" :class="{ hot: tab.key === 'top10' || tab.key === 'arbitrage' }">{{ tabStats[tab.key] }}</span>
      </button>
    </div>

    <el-alert
      class="guide-alert"
      :title="guideText"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 策略沙盘：参数敏感度分析 -->
    <el-card v-if="appStore.showSandbox" class="sandbox-card" shadow="never">
      <template #header>
        <div class="sandbox-header" @click="sandboxOpen = !sandboxOpen">
          <span class="sandbox-title">策略沙盘 · 敏感度分析</span>
          <el-icon class="sandbox-toggle" :class="{ expanded: sandboxOpen }"><ArrowDown /></el-icon>
        </div>
      </template>
      <transition name="expand">
        <div v-show="sandboxOpen" class="sandbox-body">
          <div class="sandbox-sliders">
            <SensitivitySlider
              v-model="sandbox.premium"
              label="溢价率"
              :min="0"
              :max="20"
              :step="0.1"
              unit="%"
            />
            <SensitivitySlider
              v-model="sandbox.amount"
              label="申购金额"
              :min="1000"
              :max="100000"
              :step="1000"
              :format-fn="v => (v / 10000).toFixed(1) + ' 万'"
            />
            <SensitivitySlider
              v-model="sandbox.feeRate"
              label="申购费率"
              :min="0"
              :max="1"
              :step="0.01"
              unit="%"
            />
          </div>
          <div class="sandbox-result">
            <div class="result-row">
              <span class="result-label">套利收益</span>
              <span class="result-value" :class="{ positive: sandboxProfit > 0, negative: sandboxProfit < 0 }">
                {{ sandboxProfit.toFixed(2) }} 元
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">净溢价</span>
              <span class="result-value" :class="{ positive: sandboxNetPremium > 0 }">
                {{ sandboxNetPremium.toFixed(2) }}%
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">收益率</span>
              <span class="result-value" :class="{ positive: sandboxProfit > 0 }">
                {{ sandboxROI.toFixed(2) }}%
              </span>
            </div>
            <div class="result-tip">
              <span v-if="sandboxNetPremium > 0">净溢价为正，存在套利空间</span>
              <span v-else style="color: var(--el-color-danger)">净溢价为负，无套利空间</span>
            </div>
          </div>
        </div>
      </transition>
    </el-card>

    <!-- 桌面表格 -->
    <el-table
      v-if="activeTab !== 'arbitrage'"
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
      <el-table-column width="110" align="right" sortable :sort-by="'premium'">
        <template #header>
          溢价率<FormulaInfo
            formula="(场内价格 - 基金净值) / 基金净值 × 100%"
            example="价格 1.05，净值 1.00 → 溢价率 = 5%"
            note="溢价率 > 0 表示场内贵，可申购套利"
          />
        </template>
        <template #default="{ row }">
          <span
            class="premium-value"
            :class="{ negative: row.premium < 0, high: row.isHighPremium }"
          >{{ row.premiumText }}</span>
        </template>
      </el-table-column>
      <el-table-column width="110" align="right">
        <template #header>
          净溢价<FormulaInfo
            formula="净溢价 = 溢价率 - 申购费率 - 卖出佣金率"
            example="5% - 0.15% - 0.05% = 4.80%"
            note="净溢价 > 0 才有套利空间"
          />
        </template>
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
      <el-table-column width="120" align="right">
        <template #header>
          预期收益(万)<FormulaInfo
            formula="预期收益 = 申购金额 × 净溢价 / 100"
            example="1万 × 4.8% = 480元"
            note="按1万元申购估算，实际收益受净值波动影响"
          />
        </template>
        <template #default="{ row }">
          <span class="expected-return">{{ row.expectedProfit }}</span>
        </template>
      </el-table-column>
      <el-table-column label="申购状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.limitStatus)" size="small" effect="light">{{ row.limitStatus }}</el-tag>
          <div v-if="row.limitAmount" class="price-sub">限{{ row.limitAmount }}元</div>
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
    <div class="mobile-cards" v-if="activeTab !== 'arbitrage'" v-loading="store.loading">
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
            <span class="mc-label">预期收益</span>
            <span class="expected-return">{{ row.expectedProfit }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">连续溢价</span>
            <span :class="{ hl: row.sustainedPremium }">{{ row.consecutivePremium }}天</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">成交额</span>
            <span :class="amountClass(row)">{{ row.amountText }}</span>
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

    <!-- 套利机会 Tab 桌面表格 -->
    <el-table
      v-if="activeTab === 'arbitrage'"
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
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="溢价率" width="110" align="right" sortable :sort-by="'premium'">
        <template #default="{ row }">
          <span
            class="premium-value"
            :class="{ negative: row.premium < 0, high: row.isHighlight }"
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
      <el-table-column label="成交额" width="110" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row)">{{ row.amountText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预期收益(万)" width="120" align="right">
        <template #header>
          预期收益(万)<FormulaInfo
            formula="预期收益 = 申购金额 × 净溢价 / 100"
            example="1万 × 4.8% = 480元"
            note="按1万元申购估算，实际收益受净值波动影响"
          />
        </template>
        <template #default="{ row }">
          <span class="expected-return">{{ row.expectedProfit }}</span>
        </template>
      </el-table-column>
      <el-table-column label="风险提示" width="220">
        <template #default="{ row }">
          <div class="tag-group">
            <el-tag v-if="row.lowLiquidity" type="danger" size="small" effect="dark">流动性低</el-tag>
            <el-tag v-if="row.sustainedPremium" type="warning" size="small" effect="plain">连续溢价{{ row.consecutivePremium }}天</el-tag>
            <el-tag v-if="row.limitAmount" type="primary" size="small" effect="plain">限购100</el-tag>
            <span v-if="!row.lowLiquidity && !row.sustainedPremium && !row.limitAmount" class="risk-empty">--</span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 套利机会 Tab 移动卡片流 -->
    <div class="mobile-cards" v-if="activeTab === 'arbitrage'" v-loading="store.loading">
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
          <span class="code-text">{{ row.code }}</span>
        </div>
        <div class="mc-metrics">
          <div class="mc-metric">
            <span class="mc-label">溢价率</span>
            <span
              class="premium-value"
              :class="{ negative: row.premium < 0, high: row.isHighlight }"
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
            <span class="mc-label">成交额</span>
            <span :class="amountClass(row)">{{ row.amountText }}</span>
          </div>
          <div class="mc-metric">
            <span class="mc-label">预期收益</span>
            <span class="expected-return">{{ row.expectedProfit }}</span>
          </div>
        </div>
        <div class="mc-tags" v-if="row.lowLiquidity || row.sustainedPremium || row.limitAmount">
          <el-tag v-if="row.lowLiquidity" type="danger" size="small" effect="dark">流动性低</el-tag>
          <el-tag v-if="row.sustainedPremium" type="warning" size="small" effect="plain">连续溢价{{ row.consecutivePremium }}天</el-tag>
          <el-tag v-if="row.limitAmount" type="primary" size="small" effect="plain">限购100</el-tag>
        </div>
      </el-card>
      <el-empty v-if="!store.loading && pagedList.length === 0" description="暂无套利机会" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :fullscreen="isMobile"
      width="640px"
      class="lof-detail-dialog"
    >
      <template #header>
        <div class="dialog-header-fund">
          <span class="dialog-fund-title" v-if="detailData">
            {{ detailData.name }} ({{ detailData.code }})
          </span>
          <el-tag
            v-if="detailData"
            :type="statusTagType(detailData.limitStatus)"
            size="small"
            effect="light"
          >{{ detailData.limitStatus }}</el-tag>
        </div>
      </template>
      <template v-if="detailData">
        <!-- 基础信息 -->
        <div class="detail-section">
          <div class="detail-section-title">基础信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">交易所</span>
              <span class="detail-value">{{ detailData.exchange || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">涨跌幅</span>
              <span class="detail-value" :class="detailData.isChangeUp ? 'up' : 'down'">{{ detailData.changePctText }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申购限额</span>
              <span class="detail-value">{{ detailData.limitAmount != null ? detailData.limitAmount + '元' : '不限' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">赎回规则</span>
              <span class="detail-value">{{ detailData.exchange === '深' ? 'T+1可赎' : '当天可赎' }}</span>
            </div>
          </div>
        </div>

        <!-- 价格与溢价 -->
        <div class="detail-section">
          <div class="detail-section-title">价格与溢价</div>
          <div class="detail-grid">
            <div class="detail-item hl-box">
              <span class="detail-label">当前价</span>
              <span class="detail-value hl">{{ detailData.priceText }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">基金净值</span>
              <span class="detail-value hl">{{ detailData.valuationText }}</span>
            </div>

            <!-- 溢价率：悬浮公式 -->
            <div class="detail-item hl-box">
              <span class="detail-label">溢价率</span>
              <el-tooltip placement="top" :show-after="300">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">溢价率 = (场内价格 - 基金净值) / 基金净值 × 100%</div>
                    <div class="ft-section" v-if="detailData.valuation > 0">
                      <div class="ft-subtitle">计算过程</div>
                      <div class="ft-detail">场内价格 = <b>{{ detailData.price.toFixed(3) }}</b></div>
                      <div class="ft-detail">基金净值 = <b>{{ detailData.valuation.toFixed(4) }}</b></div>
                      <div class="ft-detail">
                        溢价率 = ({{ detailData.price.toFixed(3) }} - {{ detailData.valuation.toFixed(4) }}) / {{ detailData.valuation.toFixed(4) }} × 100%
                        = <b>{{ detailData.premium.toFixed(2) }}%</b>
                      </div>
                    </div>
                    <div class="ft-note">溢价率 &gt; 0 表示场内贵，可申购套利</div>
                  </div>
                </template>
                <span class="detail-value hover-value" :class="{ negative: detailData.premium < 0, high: detailData.isHighPremium }">{{ detailData.premiumText }}</span>
              </el-tooltip>
            </div>

            <!-- 净溢价：悬浮公式 -->
            <div class="detail-item hl-box">
              <span class="detail-label">净溢价(扣费后)</span>
              <el-tooltip placement="top" :show-after="300">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">净溢价 = 溢价率 - 申购费率 - 卖出佣金率</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">计算过程</div>
                      <div class="ft-detail">溢价率 = <b>{{ detailData.premium.toFixed(2) }}%</b></div>
                      <div class="ft-detail">申购费率 = <b>0.15%</b>（一折券商）</div>
                      <div class="ft-detail">卖出佣金率 = <b>0.05%</b></div>
                      <div class="ft-detail">
                        净溢价 = {{ detailData.premium.toFixed(2) }} - 0.15 - 0.05
                        = <b>{{ detailNetPremium.toFixed(2) }}%</b>
                      </div>
                    </div>
                    <div class="ft-note">净溢价 &gt; 0 才有套利空间</div>
                  </div>
                </template>
                <span class="detail-value hover-value" :class="{ negative: detailData.netPremiumClass === 'negative', high: detailData.netPremiumClass === 'high' }">{{ detailData.netPremiumText }}</span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- 流动性数据 -->
        <div class="detail-section">
          <div class="detail-section-title">流动性数据</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">成交额</span>
              <span class="detail-value" :class="amountClass(detailData)">{{ detailData.amountText }}</span>
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

        <!-- 收益计算 -->
        <div class="detail-section">
          <div class="detail-section-title">收益计算</div>
          <div class="detail-grid">
            <!-- 预期收益：悬浮公式 -->
            <div class="detail-item hl-box">
              <span class="detail-label">预期收益({{ detailOneBaseLabel }})</span>
              <el-tooltip placement="top" :show-after="300">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">预期收益 = 申购金额 × 净溢价 / 100</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">计算过程</div>
                      <div class="ft-detail">申购金额 = <b>{{ detailOneBase.toLocaleString() }} 元</b></div>
                      <div class="ft-detail">净溢价 = <b>{{ detailNetPremium.toFixed(2) }}%</b></div>
                      <div class="ft-detail">
                        预期收益 = {{ detailOneBase.toLocaleString() }} × {{ detailNetPremium.toFixed(2) }} / 100
                        = <b>{{ detailOneProfit.toFixed(2) }} 元</b>
                      </div>
                    </div>
                    <div class="ft-note" v-if="detailData.limitAmount">当前限购 {{ detailData.limitAmount }} 元，按限额计算</div>
                    <div class="ft-note" v-else>按 1 万元申购估算，实际收益受净值波动影响</div>
                  </div>
                </template>
                <span class="detail-value hover-value hl">{{ detailOneProfit.toFixed(2) }} 元</span>
              </el-tooltip>
            </div>

            <!-- 一拖六收益：悬浮公式（仅限购场景） -->
            <div class="detail-item hl-box" v-if="detailData.limitStatus === '限100'">
              <span class="detail-label">一拖六收益</span>
              <el-tooltip placement="top" :show-after="300">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">一拖六收益 = 6账户 × 100元 × 净溢价 / 100</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">计算过程</div>
                      <div class="ft-detail">账户数 = <b>6</b></div>
                      <div class="ft-detail">单账户限额 = <b>100 元</b></div>
                      <div class="ft-detail">净溢价 = <b>{{ detailNetPremium.toFixed(2) }}%</b></div>
                      <div class="ft-detail">
                        收益 = 6 × 100 × {{ detailNetPremium.toFixed(2) }} / 100
                        = <b>{{ detailSixProfit.toFixed(2) }} 元</b>
                      </div>
                    </div>
                    <div class="ft-note">一拖六账户可放大限购场景下的收益</div>
                  </div>
                </template>
                <span class="detail-value hover-value hl">{{ detailSixProfit.toFixed(2) }} 元</span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- 操作建议 -->
        <div class="detail-section">
          <div class="detail-section-title">操作建议</div>
          <div class="advice-box">
            <p v-for="(p, idx) in adviceParagraphs" :key="idx">{{ p }}</p>
          </div>
        </div>

        <!-- 套利资金预测（仅溢价基金显示） -->
        <div v-if="detailData?.premium > 0" class="detail-section">
          <div class="detail-section-title">套利资金预测</div>
          <div v-if="store.arbitrageLoading" class="predict-loading">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else-if="store.arbitrageError" class="predict-error">
            <span class="error-text">数据源不可用</span>
          </div>
          <div v-else-if="store.arbitragePredict" class="predict-content">
            <ArbitrageChart
              :history="store.arbitragePredict.history"
              :predicted-fund="store.arbitragePredict.predicted_fund"
            />
            <div class="predict-cards">
              <div class="predict-card">
                <span class="pc-label">7日累计资金</span>
                <span class="pc-value">{{ formatTotalAmount(store.arbitragePredict.cumulative_fund) }}</span>
              </div>
              <div class="predict-card">
                <span class="pc-label">估算套利人数</span>
                <span class="pc-value">{{ store.arbitragePredict.cumulative_people != null ? store.arbitragePredict.cumulative_people.toLocaleString() + '人' : 'N/A' }}</span>
              </div>
              <div class="predict-card">
                <span class="pc-label">明日预测</span>
                <span class="pc-value" :class="{ hl: store.arbitragePredict.predicted_fund != null }">{{ store.arbitragePredict.predicted_fund != null ? formatTotalAmount(store.arbitragePredict.predicted_fund) : '数据不足' }}</span>
              </div>
              <div class="predict-card risk-card">
                <span class="pc-label">出逃风险</span>
                <el-tag
                  :type="riskTagType(store.arbitragePredict.risk_level)"
                  size="small"
                  effect="dark"
                >{{ store.arbitragePredict.risk_label }}</el-tag>
              </div>
            </div>
            <div v-if="store.arbitragePredict.note" class="predict-note">
              {{ store.arbitragePredict.note }}
            </div>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 公式回忆（检索练习） -->
    <FormulaRecall :items="recallItems" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Star, StarFilled, ArrowDown } from '@element-plus/icons-vue'
import { useLofStore } from '@/stores/lof'
import { useUserStore } from '@/stores/user'
import TierBadge from '@/components/TierBadge.vue'
import TimeStamp from '@/components/TimeStamp.vue'
import FormulaInfo from '@/components/FormulaInfo.vue'
import SensitivitySlider from '@/components/SensitivitySlider.vue'
import FormulaRecall from '@/components/FormulaRecall.vue'
import ArbitrageChart from '@/components/ArbitrageChart.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const store = useLofStore()
const userStore = useUserStore()

const activeTab = ref('top10')
const searchKeyword = ref('')
const detailVisible = ref(false)
const detailData = ref(null)
const isMobile = ref(false)

// 策略沙盘
const sandboxOpen = ref(false)
const sandbox = ref({ premium: 5, amount: 10000, feeRate: 0.15 })
const SELL_COMMISSION_RATE = 0.05
const sandboxProfit = computed(() => {
  const s = sandbox.value
  return s.amount * s.premium / 100 - s.amount * s.feeRate / 100 - s.amount * SELL_COMMISSION_RATE / 100
})
const sandboxNetPremium = computed(() => sandbox.value.premium - sandbox.value.feeRate - SELL_COMMISSION_RATE)
const sandboxROI = computed(() => {
  const s = sandbox.value
  return s.amount > 0 ? (sandboxProfit.value / s.amount * 100) : 0
})

// 公式回忆
const recallItems = [
  { prompt: '溢价率 = (____ - 基金净值) / 基金净值 × 100%', answer: '场内价格', placeholder: '缺失的项' },
  { prompt: '净溢价 = 溢价率 - ____ - 卖出佣金率', answer: '申购费率', placeholder: '缺失的项' },
  { prompt: '套利收益 = 申购金额 × ____ - 申购费 - 卖出佣金', answer: '溢价率', placeholder: '缺失的项' }
]

const tabs = [
  { key: 'top10', label: '溢价Top10' },
  { key: 'premium', label: '溢价≥5%' },
  { key: 'discount', label: '折价' },
  { key: 'paused', label: '暂停' },
  { key: 'arbitrage', label: '套利机会' }
]

const guideTextMap = {
  top10: '溢价可申购 Top10：未暂停且溢价>0 的基金，按溢价率降序取前 10。核心关注预期收益与流动性。',
  premium: '溢价≥5% 的基金，具备申购套利潜力。注意流动性风险与净值波动。',
  discount: '折价基金，可考虑持有套利（需≥7天，赎回费0.5%）。注意净值波动。',
  paused: '申购暂停的基金，无法套利。关注恢复申购后的溢价变化。',
  arbitrage: '筛选可套利机会（溢价≥3%且成交额≥100万），按溢价率降序排列。注意流动性风险与限购影响。'
}

const guideText = computed(() => guideTextMap[activeTab.value])

// 套利机会列表：可套利且按溢价率降序
const arbitrageList = computed(() => {
  return store.fundList
    .filter(i => i.canArbitrage === true)
    .slice()
    .sort((a, b) => b.premium - a.premium)
})

// 按 Tab 过滤
const filteredByTab = computed(() => {
  const list = store.fundList
  if (activeTab.value === 'top10') return list
    .filter(i => !i.isPaused && i.premium > 0)
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10)
  if (activeTab.value === 'premium') return list.filter(i => i.premiumValue >= 5)
  if (activeTab.value === 'discount') return list.filter(i => i.premiumValue < 0)
  if (activeTab.value === 'paused') return list.filter(i => i.isPaused)
  if (activeTab.value === 'arbitrage') return arbitrageList.value
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
  const top10List = list.filter(i => !i.isPaused && i.premium > 0).sort((a, b) => b.premium - a.premium).slice(0, 10)
  return {
    top10: top10List.length,
    premium: list.filter(i => i.premiumValue >= 5).length,
    discount: list.filter(i => i.premiumValue < 0).length,
    paused: list.filter(i => i.isPaused).length,
    arbitrage: list.filter(i => i.canArbitrage).length
  }
})

const summary = computed(() => store.summary)

// 详情弹窗：净溢价（扣申购费 0.15% + 卖出佣金 0.05%）
const detailNetPremium = computed(() => {
  if (!detailData.value) return 0
  return detailData.value.premium - 0.15 - SELL_COMMISSION_RATE
})

// 详情弹窗：申购基数标签（限购显示限额，否则显示1万）
const detailOneBaseLabel = computed(() => {
  if (!detailData.value) return '1万'
  const limit = detailData.value.limitAmount
  return limit && limit > 0 ? limit + '元' : '1万'
})

// 详情弹窗：一拖一账户申购基数（限购时为限额，否则 10000）
const detailOneBase = computed(() => {
  if (!detailData.value) return 10000
  const limit = detailData.value.limitAmount
  return limit && limit > 0 ? limit : 10000
})

// 详情弹窗：一拖一账户预期收益金额
const detailOneProfit = computed(() => {
  if (!detailData.value) return 0
  return detailOneBase.value * detailNetPremium.value / 100
})

// 详情弹窗：一拖一账户预期收益文案（含高亮金额）
const detailOneText = computed(() => {
  if (!detailData.value) return ''
  const np = detailNetPremium.value
  const profit = detailOneProfit.value.toFixed(2)
  const limit = detailData.value.limitAmount
  if (limit && limit > 0) {
    return `限购 ${limit} 元，预期收益 = ${limit} × ${np.toFixed(2)} / 100 = <span class="profit-num">${profit} 元</span>`
  }
  return `按 10000 元申购计算，预期收益 = <span class="profit-num">${profit} 元</span>`
})

// 详情弹窗：一拖六账户预期收益金额（仅限购 100 场景）
const detailSixProfit = computed(() => {
  if (!detailData.value) return 0
  return 6 * 100 * detailNetPremium.value / 100
})

// 详情弹窗：操作建议分段（按句号拆分）
const adviceParagraphs = computed(() => {
  if (!detailData.value?.advice) return []
  return detailData.value.advice
    .split('。')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + '。')
})

// 详情弹窗：限额说明文案
const limitDescText = computed(() => {
  if (!detailData.value) return ''
  const status = detailData.value.limitStatus
  if (status === '暂停') return '当前无法申购，关注恢复申购后的溢价变化'
  if (status === '限100') return '单账户限购 100 元，可一拖六账户放大收益'
  return '无申购限额，可按需申购'
})

function formatPremiumNum(val) {
  if (val == null || val === '--' || isNaN(val)) return '--'
  return Number(val).toFixed(2) + '%'
}

function formatTotalAmount(val) {
  if (val == null || isNaN(val) || val <= 0) return '--'
  if (val >= 10000) return (val / 10000).toFixed(2) + '亿'
  if (val >= 100) return val.toFixed(2) + '万'
  return val.toFixed(0) + '元'
}

function openDetail(row) {
  detailData.value = row
  detailVisible.value = true
  if (row.premium > 0) {
    store.loadArbitragePredict(row.code, {
      amount: row.amountRaw,
      premium: row.premium,
      limit_status: row.limitStatus,
      limit_amount: row.limitAmount || 0
    })
  } else {
    store.clearArbitragePredict()
  }
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

function riskTagType(level) {
  if (level === 'low') return 'success'
  if (level === 'medium') return 'warning'
  if (level === 'high') return 'danger'
  if (level === 'extreme') return 'danger'
  return 'info'
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
              color: var(--el-color-danger);
            }

            &.negative {
              color: var(--el-color-success);
            }
          }
        }

        .result-tip {
          font-size: 12px;
          color: var(--el-color-success);
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

  .hover-value {
    cursor: help;
    border-bottom: 1px dashed var(--text-color-secondary);
    padding-bottom: 1px;
    transition: border-color 0.2s;
    &:hover {
      border-bottom-color: var(--el-color-primary);
    }
  }

  .warning { color: var(--el-color-warning); font-weight: 600; }
  .negative { color: var(--el-color-danger); font-weight: 600; }

  .mobile-cards {
    display: none;
  }

  :deep(.row-highlight) {
    td {
      background: rgba(245, 108, 108, 0.06) !important;
    }
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
        &.up { color: var(--el-color-danger); }
        &.down { color: var(--el-color-success); }
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

    p {
      margin: 0 0 6px 0;
      &:last-child { margin-bottom: 0; }
    }
  }

  /* 套利资金预测 */
  .predict-loading {
    padding: 16px;
  }

  .predict-error {
    text-align: center;
    padding: 16px;
    color: var(--text-color-secondary);

    .error-text {
      font-size: 13px;
    }
  }

  .predict-content {
    .predict-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .predict-card {
      background: var(--el-fill-color-light);
      border-radius: 6px;
      padding: 8px;
      text-align: center;

      &.risk-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .pc-label {
        display: block;
        font-size: 11px;
        color: var(--text-color-secondary);
        margin-bottom: 4px;
      }

      .pc-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);

        &.hl {
          color: var(--el-color-primary);
        }
      }
    }

    .predict-note {
      margin-top: 8px;
      font-size: 11px;
      color: var(--el-color-warning);
      background: rgba(245, 166, 35, 0.1);
      padding: 6px 10px;
      border-radius: 4px;
    }
  }

  /* 套利机会 Tab：预期收益与风险提示 */
  .expected-return {
    color: var(--el-color-success);
    font-weight: 600;
  }

  .risk-empty {
    color: var(--text-color-secondary);
    font-size: 13px;
  }

  /* 详情弹窗：卡片区域 */
  .detail-card {
    margin-bottom: 18px;
    border-radius: 8px;

    :deep(.el-card__header) {
      padding: 10px 16px;
    }

    :deep(.el-card__body) {
      padding: 12px 16px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      padding-left: 8px;
      border-left: 3px solid var(--el-color-primary);
    }
  }

  .calc-list {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .calc-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;

      &.calc-row-text {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .calc-label {
        color: var(--text-color-secondary);
        flex-shrink: 0;
      }

      .calc-value {
        font-weight: 600;
        color: var(--text-color);

        &.net-profit {
          color: var(--el-color-success);
        }
      }

      .calc-value-text {
        color: var(--text-color);
        line-height: 1.6;
        word-break: break-all;

        :deep(.profit-num),
        .profit-num {
          color: var(--el-color-danger);
          font-weight: 700;
        }
      }
    }

    .calc-tip {
      margin-top: 4px;
      font-size: 12px;
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
      border-radius: 4px;
      padding: 6px 10px;
    }
  }

  .limit-box {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    .limit-desc {
      font-size: 13px;
      color: var(--text-color);
    }
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
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
</style>

<style lang="scss">
.lof-detail-dialog {
  .dialog-header-fund {
    display: flex;
    align-items: center;
    gap: 8px;

    .dialog-fund-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
}

.formula-tip {
  font-size: 12px;
  line-height: 1.7;
  min-width: 260px;
  max-width: 360px;

  .ft-formula {
    font-size: 13px;
    font-weight: 600;
    color: #409eff;
    margin-bottom: 8px;
    padding: 4px 8px;
    background: rgba(64, 158, 255, 0.1);
    border-radius: 4px;
    border-left: 3px solid #409eff;
  }

  .ft-section {
    margin-bottom: 4px;
  }

  .ft-detail {
    color: var(--el-text-color-secondary);
    padding: 1px 0;

    b {
      color: var(--el-text-color-primary);
      font-weight: 600;
    }
  }

  .ft-note {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--el-border-color);
    color: var(--el-text-color-secondary);
    font-size: 11px;
    font-style: italic;
  }

  .ft-subtitle {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
    font-size: 12px;
  }
}
</style>
