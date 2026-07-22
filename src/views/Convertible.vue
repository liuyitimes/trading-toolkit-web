<template>
  <div class="page-container convertible-page">
    <div class="page-header page-header-flex">
      <h2>可转债监控</h2>
      <TierBadge :tier="store.tier" :threshold="store.threshold" />
      <el-input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索转债名称/代码/正股"
        clearable
        :prefix-icon="Search"
        size="default"
      />
    </div>

    <!-- 市场温度 -->
    <div class="market-overview" v-loading="store.loading && !store.marketTemp">
      <div class="overview-header">
        <span class="overview-title">市场温度</span>
        <el-tag size="small" effect="plain">{{ marketTemp?.marketStatus || '--' }}</el-tag>
        <TimeStamp v-if="store.lastUpdated" :time="store.lastUpdated" :stale-after="30" />
      </div>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value">{{ marketTemp?.count ?? '--' }}</div>
          <div class="overview-label">在市转债</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ marketTemp?.priceMedian ?? '--' }}</div>
          <div class="overview-label">价格中位数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ formatPremiumMedian(marketTemp?.premiumMedian) }}</div>
          <div class="overview-label">溢价中位数</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ marketTemp?.doubleLowMedian ?? '--' }}</div>
          <div class="overview-label">双低中位数</div>
        </div>
      </div>
    </div>

    <!-- 信号 Tab 栏 -->
    <div class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="switchTab(t.key)"
      >
        <span class="tab-label">{{ t.label }}</span>
        <span class="tab-count" :class="{ hot: t.key === 'placement' }">{{ tabCount(t.key) }}</span>
      </button>
    </div>

    <!-- 投资指引 -->
    <el-alert class="guide-alert" type="info" :closable="false" show-icon>
      <span>{{ guideText }}</span>
    </el-alert>

    <!-- 策略沙盘：参数敏感度分析 -->
    <el-card v-if="appStore.showSandbox" class="sandbox-card" shadow="never">
      <template #header>
        <div class="sandbox-header" @click="sandboxOpen = !sandboxOpen">
          <span class="sandbox-title">策略沙盘 · 双低值敏感度</span>
          <el-icon class="sandbox-toggle" :class="{ expanded: sandboxOpen }"><ArrowDown /></el-icon>
        </div>
      </template>
      <transition name="expand">
        <div v-show="sandboxOpen" class="sandbox-body">
          <div class="sandbox-sliders">
            <SensitivitySlider
              v-model="cbSandbox.price"
              label="转债价格"
              :min="80"
              :max="160"
              :step="1"
              unit=" 元"
            />
            <SensitivitySlider
              v-model="cbSandbox.premium"
              label="溢价率"
              :min="-20"
              :max="60"
              :step="1"
              unit="%"
            />
            <SensitivitySlider
              v-model="cbSandbox.convPrice"
              label="转股价"
              :min="5"
              :max="30"
              :step="0.5"
              unit=" 元"
            />
          </div>
          <div class="sandbox-result">
            <div class="result-row">
              <span class="result-label">双低值</span>
              <span class="result-value" :class="{ low: cbDoubleLow < 130 }">{{ cbDoubleLow.toFixed(1) }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">转股价值</span>
              <span class="result-value">{{ cbConvValue.toFixed(2) }} 元</span>
            </div>
            <div class="result-row">
              <span class="result-label">隐含正股价</span>
              <span class="result-value sub">{{ cbStockPrice.toFixed(2) }} 元</span>
            </div>
            <div class="result-row">
              <span class="result-label">建议</span>
              <span class="result-tip" :class="{ warn: cbDoubleLow >= 130 }">{{ cbAdvice }}</span>
            </div>
          </div>
        </div>
      </transition>
    </el-card>

    <!-- 配售 Tab -->
    <div v-if="activeTab === 'placement'" class="tab-content">
      <div class="sub-toolbar">
        <div class="sub-tabs">
          <button
            v-for="s in placementSubs"
            :key="s.key"
            class="sub-btn"
            :class="{ active: placementSubTab === s.key }"
            @click="switchPlacementSub(s.key)"
          >
            {{ s.label }}
            <span class="sub-count" :class="{ hot: s.key === 'subscribing' }">{{ placementTabStats[s.stat] }}</span>
          </button>
        </div>
        <div class="sort-row">
          <button
            v-for="f in sortFields"
            :key="f.field"
            class="sort-btn"
            :class="{ active: placementSortBy === f.field }"
            @click="toggleSort(f.field)"
          >
            {{ f.label }}<span v-if="placementSortBy === f.field">{{ placementSortAsc ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>

      <el-empty v-if="!filteredPlacement.length" description="暂无符合条件的标的" />

      <el-table
        v-else
        :data="filteredPlacement"
        class="desktop-table"
        stripe
        @row-click="openPendingDetail"
      >
        <el-table-column label="正股" min-width="200">
          <template #default="{ row }">
            <div class="name-cell">
              <div class="name-line">
                <ExchangeBadge v-if="row.exchange" :exchange="row.exchange" />
                <span class="bond-name">{{ row.stockName }}</span>
                <el-tag v-if="row.riskLevel" size="small" :type="riskTagType(row.riskClass)" effect="light">{{ row.riskLabel }}</el-tag>
                <el-tag v-if="row.regBadge" size="small" :type="row.regBadgeClass === 'hot' ? 'danger' : 'warning'" effect="dark">{{ row.regBadge }}</el-tag>
              </div>
              <div class="code-line">
                <span class="code-text">{{ row.stockCode }}</span>
                <span class="code-price">{{ row.stockPrice }}</span>
                <span class="code-change" :class="row.stockChangeUp ? 'up' : 'down'">{{ row.stockChange }}</span>
                <span class="code-sep">|</span>
                <span class="progress-tag" :class="row.progressClass">{{ row.progress }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="评级" width="90" align="center">
          <template #default="{ row }">
            <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
              <template #content>
                <div class="formula-tip">
                  <div class="ft-formula">策略评级 = 综合评分分档</div>
                  <div class="ft-section">
                    <div class="ft-subtitle">当前评分</div>
                    <div class="ft-detail">综合评分：<b>{{ row.strategyScore }}/100</b></div>
                    <div class="ft-detail">评级结果：<b>{{ row.strategyRating }}</b></div>
                  </div>
                  <div class="ft-divider"></div>
                  <div class="ft-subtitle">评分维度</div>
                  <div class="ft-detail">· 安全垫（收益风险比）</div>
                  <div class="ft-detail">· 百元含权（配售性价比）</div>
                  <div class="ft-detail">· 首日可交易量（上市弹性）</div>
                  <div class="ft-detail">· 正股趋势（短期动能）</div>
                  <div class="ft-divider"></div>
                  <div class="ft-subtitle">分档标准</div>
                  <div class="ft-detail"><b style="color:#f56c6c">推荐</b>：评分 ≥ 80</div>
                  <div class="ft-detail"><b style="color:#e6a23c">可关注</b>：60 ≤ 评分 &lt; 80</div>
                  <div class="ft-detail"><b style="color:#67c23a">谨慎</b>：评分 &lt; 60</div>
                </div>
              </template>
              <el-tag :class="`rating-tag rating-${row.strategyRatingClass}`" size="small" @click.stop>
                {{ row.strategyRating }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="安全垫" width="100" align="right">
          <template #default="{ row }">
            <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
              <template #content>
                <div class="formula-tip">
                  <div class="ft-formula">安全垫 = 预估收益 ÷ 配售成本 × 100%</div>
                  <div class="ft-section">
                    <div class="ft-subtitle">计算过程</div>
                    <div class="ft-detail">预估收益 = 1000 × 20% = <b>200元</b></div>
                    <div class="ft-detail" v-if="row._actualSharesFor1Lot > 0 && row._stockPriceRaw > 0">
                      配售成本 = {{ row._actualSharesFor1Lot }}股 × {{ row._stockPriceRaw.toFixed(2) }}元
                      = <b>{{ Math.round(row._costFor10LotsRaw) }}元</b>
                    </div>
                    <div class="ft-detail" v-if="row._safetyPadRaw > 0 && row._costFor10LotsRaw > 0">
                      安全垫 = 200 ÷ {{ Math.round(row._costFor10LotsRaw) }} × 100%
                      = <b>{{ row._safetyPadRaw.toFixed(2) }}%</b>
                    </div>
                  </div>
                  <div class="ft-note">安全垫越高，正股下跌容错空间越大</div>
                </div>
              </template>
              <span class="hover-value" :class="safetyPadClass(row._safetyPadRaw)" @click.stop>{{ row.safetyPad }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="成本" width="170">
          <template #default="{ row }">
            <div class="cost-cell" @click.stop="openCostDialog(row)">
              <div class="sub-info">每股 {{ row.perShare }}</div>
              <div class="sub-info cost-value" v-if="row._costPerLotRaw > 0">
                {{ row.costPerLot }}
                <span class="cost-shares">（需买入 {{ row._actualSharesFor1Lot }}股）</span>
              </div>
              <div class="sub-info onehand" v-if="row.oneHandMinCost">一手党最低≈ {{ row.oneHandMinCost }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="百元含权" width="100" align="right">
          <template #default="{ row }">
            <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
              <template #content>
                <div class="formula-tip">
                  <div class="ft-formula">百元含权 = 每股配售 ÷ 正股价 × 100</div>
                  <div class="ft-section" v-if="row._perShareRaw > 0 && row._stockPriceRaw > 0">
                    <div class="ft-subtitle">计算过程</div>
                    <div class="ft-detail">每股配售 = <b>{{ row._perShareRaw.toFixed(4) }}元</b></div>
                    <div class="ft-detail">正股价 = <b>{{ row._stockPriceRaw.toFixed(2) }}元</b></div>
                    <div class="ft-detail">
                      百元含权 = {{ row._perShareRaw.toFixed(4) }} ÷ {{ row._stockPriceRaw.toFixed(2) }} × 100
                      = <b>{{ row._cashRatioRaw.toFixed(2) }}元</b>
                    </div>
                  </div>
                  <div class="ft-note">即每买100元正股可配售的转债金额</div>
                </div>
              </template>
              <span class="hl hover-value" @click.stop>{{ row.cashRatio }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="首日可交易量" width="130" align="right">
          <template #default="{ row }">
            <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
              <template #content>
                <div class="formula-tip">
                  <div class="ft-formula">首日可交易量 = 发行规模 − 原股东配售部分</div>
                  <div class="ft-section">
                    <div class="ft-subtitle">计算过程</div>
                    <div class="ft-detail" v-if="row._issueSizeRaw > 0">
                      发行规模 = <b>{{ row._issueSizeRaw.toFixed(2) }}亿</b>
                    </div>
                    <div class="ft-detail" v-if="row._shareholderRatioRaw > 0">
                      原股东配售率 = <b>{{ row._shareholderRatioRaw.toFixed(1) }}%</b>
                    </div>
                    <div class="ft-detail" v-if="row._issueSizeRaw > 0 && row._shareholderRatioRaw > 0">
                      首日可交易量 = {{ row._issueSizeRaw.toFixed(2) }} × (1 − {{ (row._shareholderRatioRaw / 100).toFixed(2) }})
                      = <b>{{ row._tradableAmountRaw.toFixed(2) }}亿</b>
                    </div>
                    <div class="ft-detail" v-else-if="row._tradableAmountRaw > 0">
                      首日可交易量 = <b>{{ row._tradableAmountRaw.toFixed(2) }}亿</b>
                    </div>
                  </div>
                  <div class="ft-note">含大股东锁定6个月部分，首日可交易量越小，上市后弹性越大</div>
                </div>
              </template>
              <span class="hover-value" @click.stop>{{ row.tradableAmount }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- 移动端卡片 -->
      <div class="mobile-cards">
        <el-card v-for="row in filteredPlacement" :key="row.stockCode" class="mobile-card" shadow="hover" @click="openPendingDetail(row)">
          <div class="mc-head">
            <ExchangeBadge v-if="row.exchange" :exchange="row.exchange" />
            <span class="bond-name">{{ row.stockName }}</span>
            <el-tag :class="`rating-tag rating-${row.strategyRatingClass}`" size="small">{{ row.strategyRating }}</el-tag>
            <el-tag v-if="row.regBadge" size="small" :type="row.regBadgeClass === 'hot' ? 'danger' : 'warning'" effect="dark">{{ row.regBadge }}</el-tag>
            <el-tag v-if="row.riskLevel" size="small" :type="riskTagType(row.riskClass)" effect="light">{{ row.riskLabel }}</el-tag>
          </div>
          <div class="mc-code">
            <span>{{ row.stockCode }}</span>
            <span class="code-price">{{ row.stockPrice }}</span>
            <span class="code-change" :class="row.stockChangeUp ? 'up' : 'down'">{{ row.stockChange }}</span>
            <span class="progress-tag" :class="row.progressClass">{{ row.progress }}</span>
          </div>
          <div class="mc-metrics">
            <div><span class="mc-label">含权</span><span class="hl">{{ row.cashRatio }}</span></div>
            <div><span class="mc-label">安全垫</span><span :class="safetyPadClass(row._safetyPadRaw)">{{ row.safetyPad }}</span></div>
            <div><span class="mc-label">收益</span><span class="hl">{{ row.expectedProfit }}</span></div>
            <div><span class="mc-label">规模</span>{{ row.issueSize }}</div>
            <div><span class="mc-label">可交易量</span>{{ row.tradableAmount }}</div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 信号 Tab（双低/强赎/折价/下修） -->
    <div v-else class="tab-content">
      <div class="sub-toolbar signal-toolbar">
        <div class="sub-tabs">
          <button
            v-for="s in signalQuickStats"
            :key="s.key"
            class="sub-btn signal-stat"
            disabled
          >
            {{ s.label }}
            <span class="sub-count" :class="{ hot: s.hot }">{{ s.value }}</span>
          </button>
        </div>
        <div class="sort-row">
          <button
            v-for="f in signalSortFields"
            :key="f.field"
            class="sort-btn"
            :class="{ active: signalSortBy === f.field }"
            @click="toggleSignalSort(f.field)"
          >
            {{ f.label }}<span v-if="signalSortBy === f.field">{{ signalSortAsc ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>

      <el-empty v-if="!signalList.length" description="暂无符合条件的标的" />

      <el-table
        v-else
        :data="signalList"
        class="desktop-table"
        stripe
        @row-click="(row) => openSignalDetail(row)"
      >
        <el-table-column label="转债" min-width="210">
          <template #default="{ row }">
            <div class="name-cell">
              <div class="name-line">
                <ExchangeBadge v-if="row.exchange" :exchange="row.exchange" />
                <span class="bond-name">{{ row.bondName }}</span>
                <el-tag size="small" effect="light" :type="signalTagType(row)">{{ signalTagText(row) }}</el-tag>
                <el-icon class="fav-icon" :class="{ active: row.isFavorite }" @click.stop="toggleFav(row)">
                  <StarFilled v-if="row.isFavorite" /><Star v-else />
                </el-icon>
              </div>
              <div class="code-line">
                <span class="code-text">{{ row.bondCode }}</span>
                <span class="stock-name">{{ row.stockName }}</span>
                <span class="rating-badge">{{ row.rating }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <template v-if="activeTab === 'double_low'">
          <el-table-column label="双低值" width="90" align="right">
            <template #default="{ row }">
              <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">双低值 = 转债价格 + 溢价率</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">转债价格：<b>{{ row.price }}</b></div>
                      <div class="ft-detail">溢价率：<b>{{ row.premium }}</b></div>
                    </div>
                    <div v-if="row.price !== '--' && row.premium !== '--'" class="ft-step">
                      计算：{{ row.price }} + {{ row.premium }} = {{ row.doubleLow }}
                    </div>
                    <div class="ft-note">双低值越低，转债的价格与估值组合越有吸引力。</div>
                  </div>
                </template>
                <span class="hover-value hl" @click.stop>{{ row.doubleLow }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="90" align="right">
            <template #default="{ row }">
              <span>{{ row.price }}</span>
            </template>
          </el-table-column>
          <el-table-column label="溢价率" width="110" align="right">
            <template #default="{ row }">
              <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">溢价率 = (转债价格 - 转股价值) / 转股价值 × 100%</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">转债价格：<b>{{ row.price }}</b></div>
                      <div class="ft-detail">转股价值：<b>{{ row.conversionValue }}</b></div>
                    </div>
                    <div v-if="row.price !== '--' && row.conversionValue !== '--'" class="ft-step">
                      计算：({{ row.price }} - {{ row.conversionValue }}) / {{ row.conversionValue }} × 100% = {{ row.premium }}
                    </div>
                    <div class="ft-note">负溢价表示转债价格低于转股价值，可作为转股套利的观察信号。</div>
                  </div>
                </template>
                <span :class="['hover-value', 'premium-value', row.premiumClass]" @click.stop>{{ row.premium }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="剩余规模" width="100" align="right">
            <template #default="{ row }">
              <span>{{ row.remainingSize }}</span>
            </template>
          </el-table-column>
          <el-table-column label="纯债价值" width="100" align="right">
            <template #default="{ row }">
              <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">纯债价值 = Σ 未来现金流 / (1 + 评级折现率)^t</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前口径</div>
                      <div class="ft-detail">评级折现率：<b>{{ row.bondFloorDiscountRate }}</b></div>
                      <div class="ft-detail">估算纯债价值：<b>{{ row.pureBondValue }}</b></div>
                    </div>
                    <div v-if="row.bondCashflows?.length" class="ft-section">
                      <div class="ft-subtitle">剩余现金流</div>
                      <div v-for="cf in row.bondCashflows" :key="cf.date" class="ft-detail">
                        {{ cf.date }}<b>{{ Number(cf.amount).toFixed(2) }}</b>
                      </div>
                    </div>
                    <div class="ft-note">折现率按信用评级档位估算；用于双低策略的防守参考，不等同于交易所官方估值。</div>
                  </div>
                </template>
                <span class="hover-value" @click.stop>{{ row.pureBondValue }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="到期收益率" width="110" align="right">
            <template #default="{ row }">
              <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">到期收益率 = 使 当前价格 = Σ 未来现金流 / (1 + r)^t 的 r</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">转债价格：<b>{{ row.price }}</b></div>
                      <div class="ft-detail">到期收益率：<b>{{ row.ytm }}</b></div>
                    </div>
                    <div v-if="row.bondCashflows?.length" class="ft-section">
                      <div class="ft-subtitle">现金流输入</div>
                      <div v-for="cf in row.bondCashflows" :key="cf.date" class="ft-detail">
                        {{ cf.date }}<b>{{ Number(cf.amount).toFixed(2) }}</b>
                      </div>
                    </div>
                    <div class="ft-note">按持有到期且未转股的现金流反解；价格高于债底时，YTM 可能为负。</div>
                  </div>
                </template>
                <span class="hover-value" :class="{ positive: row._ytmRaw != null && row._ytmRaw > 0, negative: row._ytmRaw != null && row._ytmRaw < 0 }" @click.stop>{{ row.ytm }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="转股价值" width="100" align="right">
            <template #default="{ row }">
              <span>{{ row.conversionValue }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成交额" width="110" align="right">
            <template #default="{ row }">
              <span>{{ row.amount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成交量" width="100" align="right">
            <template #default="{ row }">
              <span>{{ row.volume }}</span>
            </template>
          </el-table-column>
        </template>
        <template v-else>
          <el-table-column label="价格" width="90" align="right">
            <template #default="{ row }">
              <span>{{ row.price }}</span>
            </template>
          </el-table-column>
          <el-table-column label="溢价率" width="110" align="right">
            <template #default="{ row }">
            <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">溢价率 = (转债价格 - 转股价值) / 转股价值 × 100%</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">转债价格：<b>{{ row.price }}</b></div>
                      <div class="ft-detail">转股价值：<b>{{ row.conversionValue }}</b></div>
                    </div>
                    <div v-if="row.price !== '--' && row.conversionValue !== '--'" class="ft-step">
                      计算：({{ row.price }} - {{ row.conversionValue }}) / {{ row.conversionValue }} × 100% = {{ row.premium }}
                    </div>
                    <div class="ft-note">负溢价表示转债价格低于转股价值，可作为转股套利的观察信号。</div>
                  </div>
                </template>
              <span :class="['hover-value', 'premium-value', row.premiumClass]" @click.stop>{{ row.premium }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column
            v-for="col in signalColumns"
            :key="col.key"
            :label="col.label"
            :width="col.width"
            align="right"
          >
            <template #default="{ row }">
              <el-tooltip v-if="col.formula" placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">{{ col.formula }}</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">{{ col.label }}：<b>{{ col.val(row) }}</b></div>
                      <div class="ft-detail" v-if="col.example">示例：{{ col.example }}</div>
                    </div>
                    <div v-if="col.note" class="ft-note">{{ col.note }}</div>
                  </div>
                </template>
                <span class="hover-value" :class="col.cls(row)" @click.stop>{{ col.val(row) }}</span>
              </el-tooltip>
              <span v-else :class="col.cls(row)">{{ col.val(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="剩余规模" width="100" align="right">
            <template #default="{ row }">
              <span>{{ row.remainingSize }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成交量" width="100" align="right">
            <template #default="{ row }">
              <span>{{ row.volume }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成交额" width="110" align="right">
            <template #default="{ row }">
              <span>{{ row.amount }}</span>
            </template>
          </el-table-column>
        </template>
      </el-table>

      <!-- 移动端卡片 -->
      <div class="mobile-cards">
        <el-card v-for="row in signalList" :key="row.bondCode" class="mobile-card" shadow="hover" @click="openSignalDetail(row)">
          <div class="mc-head">
            <ExchangeBadge v-if="row.exchange" :exchange="row.exchange" />
            <span class="bond-name">{{ row.bondName }}</span>
            <el-tag size="small" effect="light" :type="signalTagType(row)">{{ signalTagText(row) }}</el-tag>
            <span class="rating-badge">{{ row.rating }}</span>
            <el-icon class="fav-icon" :class="{ active: row.isFavorite }" @click.stop="toggleFav(row)">
              <StarFilled v-if="row.isFavorite" /><Star v-else />
            </el-icon>
          </div>
          <div class="mc-code">
            <span>{{ row.bondCode }}</span>
            <span class="stock-name">{{ row.stockName }}</span>
          </div>
          <div class="mc-metrics">
            <div><span class="mc-label">价格</span>{{ row.price }}</div>
            <div><span class="mc-label">正股</span>{{ row.stockPrice }}</div>
            <div><span class="mc-label">溢价</span><span :class="row.premiumClass">{{ row.premium }}</span></div>
            <div v-for="col in signalColumns" :key="col.key">
              <span class="mc-label">{{ col.label }}</span>
              <span :class="col.cls(row)">{{ col.val(row) }}</span>
            </div>
            <div><span class="mc-label">规模</span>{{ row.remainingSize }}</div>
            <div><span class="mc-label">成交</span>{{ row.volume }}</div>
          </div>
        </el-card>
      </div>

      <div class="show-all-bar" v-if="needShowAll">
        <el-button text type="primary" @click="showAll = !showAll">
          {{ showAll ? '收起' : `查看全部 (${store.signals[activeTab].length})` }}
        </el-button>
      </div>
    </div>

    <!-- 待发配售详情弹窗 -->
    <el-dialog
      v-model="pendingDialogVisible"
      width="640px"
      :fullscreen="isMobile"
      class="pending-dialog"
    >
      <template #header>
        <div class="dialog-header-stock">
          <div class="dialog-header-left">
            <span class="dialog-stock-title" v-if="pendingDetail">
              {{ pendingDetail.stockName }} ({{ pendingDetail.stockCode }})
            </span>
            <el-tag
              v-if="pendingDetail && pendingDetail.sectorTag !== '--'"
              size="small"
              :type="pendingDetail.isHotSector ? 'danger' : 'info'"
              effect="light"
              class="dialog-sector-tag"
            >
              {{ pendingDetail.sectorTag }}<span v-if="pendingDetail.isHotSector">🔥</span>
            </el-tag>
          </div>
          <a
            v-if="pendingDetail && pendingDetail.stockCode && pendingDetail.stockCode !== '--'"
            class="ext-link"
            :href="`https://finance.baidu.com/stock/ab-${pendingDetail.stockCode}?openFinScope=1`"
            target="_blank"
            rel="noopener noreferrer"
            title="百度财经行情"
            @click.stop
          >
            <el-icon><TopRight /></el-icon>
          </a>
        </div>
      </template>
      <template v-if="pendingDetail">
        <!-- 发行进度 -->
        <div class="detail-section">
          <div class="detail-section-title">发行进度</div>

          <!-- 时间轴 -->
          <div class="detail-timeline">
            <div
              v-for="(s, i) in visibleStageList"
              :key="i"
              class="timeline-node"
              :class="{ active: s.status === 'current', done: s.status === 'done' }"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-line" v-if="i < visibleStageList.length - 1"></div>
              <div class="timeline-label">
                <div class="timeline-name">{{ s.name }}</div>
                <div class="timeline-date">{{ s.date || '--' }}</div>
              </div>
            </div>
          </div>

          <!-- 当前 & 下一节点 -->
          <div class="stage-progress-info">
            <div class="stage-progress-item current">
              <div class="stage-progress-dot"></div>
              <div class="stage-progress-body">
                <span class="stage-progress-label">当前节点</span>
                <span class="stage-progress-value">{{ currentStage.name }}</span>
                <span v-if="currentStage.date" class="stage-progress-date">{{ currentStage.date }}</span>
              </div>
            </div>
            <div v-if="hasFutureStages" class="stage-progress-item next">
              <div class="stage-progress-dot"></div>
              <div class="stage-progress-body">
                <span class="stage-progress-label">下一节点</span>
                <span class="stage-progress-value">{{ nextStage.name }}</span>
                <span v-if="nextStage.date" class="stage-progress-date">{{ nextStage.date }}</span>
              </div>
            </div>
          </div>
                    <!-- 登记日倒计时 -->
          <div v-if="regCountdown.show" class="reg-countdown" :class="regCountdown.level">
            <div class="reg-countdown-icon">
              <el-icon :size="20"><Calendar /></el-icon>
            </div>
            <div class="reg-countdown-content">
              <div class="reg-countdown-title">
                距股权登记日还有
                <span class="reg-countdown-days">{{ regCountdown.days }}</span>
                天
              </div>
              <div class="reg-countdown-sub">{{ pendingDetail.regDate }}（{{ regCountdown.weekday }}）</div>
            </div>
            <div v-if="regCountdown.isToday" class="reg-countdown-badge">今日登记</div>
          </div>

        </div>

        <!-- 正股风险 -->
        <div class="detail-section">
          <div class="detail-section-title">正股风险</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">正股价</span><span class="detail-value">{{ pendingDetail.stockPrice }}</span></div>
            <div class="detail-item"><span class="detail-label">正股涨幅</span><span class="detail-value">{{ pendingDetail.stockChange }}</span></div>
            <div class="detail-item"><span class="detail-label">市净率PB</span><span class="detail-value">{{ pendingDetail.pb }}</span></div>
            <div class="detail-item"><span class="detail-label">vs20日均价</span><span class="detail-value" :class="trendClass(pendingDetail._stockTrendRaw)">{{ pendingDetail.stockTrend }}</span></div>
            <div class="detail-item"><span class="detail-label">20日均价</span><span class="detail-value">{{ pendingDetail.ma20Price }}</span></div>
            <div class="detail-item"><span class="detail-label">登记日基准价</span><span class="detail-value">{{ pendingDetail.recordPrice }}</span></div>
          </div>
        </div>

        <!-- 发行信息 -->
        <div class="detail-section">
          <div class="detail-section-title">发行信息</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">转债名称</span><span class="detail-value">{{ pendingDetail.bondName }}</span></div>
            <div class="detail-item"><span class="detail-label">转债代码</span><span class="detail-value">{{ pendingDetail.bondCode }}</span></div>
            <div class="detail-item"><span class="detail-label">发行规模</span><span class="detail-value">{{ pendingDetail.issueSize }}</span></div>
            <div class="detail-item" v-if="pendingDetail.rating !== '暂无'"><span class="detail-label">信用评级</span><span class="detail-value">{{ pendingDetail.rating }}</span></div>
            <div class="detail-item"><span class="detail-label">转股价</span><span class="detail-value">{{ pendingDetail.conversionPrice }}</span></div>
            <div class="detail-item"><span class="detail-label">方案进展</span><span class="detail-value">{{ pendingDetail.progress }}</span></div>
            <div class="detail-item"><span class="detail-label">股东配售率</span><span class="detail-value">{{ pendingDetail.shareholderRatio }}</span></div>
            <div class="detail-item"><span class="detail-label">股权登记日</span><span class="detail-value copyable" @click="copyText(pendingDetail.regDate)">{{ pendingDetail.regDate }}</span></div>
            <div class="detail-item" v-if="pendingDetail.onlineIssueSize !== '暂无'"><span class="detail-label">网上规模</span><span class="detail-value">{{ pendingDetail.onlineIssueSize }}</span></div>
            <div class="detail-item" v-if="pendingDetail.winRate !== '暂无'"><span class="detail-label">中签率</span><span class="detail-value">{{ pendingDetail.winRate }}</span></div>
          </div>
        </div>

        <!-- 核心指标 -->
        <div class="detail-section">
          <div class="detail-section-title">核心指标</div>
          <div class="detail-grid">
            <div class="detail-item hl-box"><span class="detail-label">安全垫</span><span class="detail-value hl">{{ pendingDetail.safetyPad }}</span></div>
            <div class="detail-item hl-box"><span class="detail-label">百元含权</span><span class="detail-value hl">{{ pendingDetail.cashRatio }}</span></div>
            <div class="detail-item hl-box"><span class="detail-label">预估收益(10张)</span><span class="detail-value hl">{{ pendingDetail.expectedProfit }}</span></div>
            <div class="detail-item"><span class="detail-label">每股配售</span><span class="detail-value">{{ pendingDetail.perShare }}</span></div>
            <div class="detail-item"><span class="detail-label">配10张需</span><span class="detail-value">{{ pendingDetail.sharesFor10 }}</span></div>
            <div class="detail-item"><span class="detail-label">一手党最低</span><span class="detail-value">{{ pendingDetail.oneHandMinCost || '--' }}</span></div>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 获配每手成本说明弹窗 -->
    <el-dialog v-model="costDialogVisible" title="获配每手成本说明" width="560px" :fullscreen="isMobile" class="cost-dialog">
      <div v-if="costDialogRow">
        <!-- 第一部分：1-5手配售参数表格 -->
        <el-table v-if="costTableData.length" :data="costTableData" border size="small" style="width: 100%; margin-bottom: 16px;">
          <el-table-column prop="lots" label="手数" width="70" align="center">
            <template #default="{ row }">{{ row.lots }}手</template>
          </el-table-column>
          <el-table-column prop="perShare" label="每股配售额" align="center" />
          <el-table-column prop="theoreticalShares" label="理论股数" align="center" />
          <el-table-column prop="actualShares" label="实际所需股数" align="center" />
          <el-table-column prop="minCost" label="最低资金" align="center" />
        </el-table>
        <div v-else style="text-align: center; padding: 20px; color: #999;">暂无数据</div>

        <!-- 第二部分：一手党成功率参考（仅沪市） -->
        <div v-if="oneHandTierData.length" class="tier-section">
          <div class="tier-section-title">一手党成功率参考</div>
          <el-table :data="oneHandTierData" border size="small" style="width: 100%; margin-bottom: 16px;">
            <el-table-column prop="ratio" label="成功率档位" width="100" align="center">
              <template #default="{ row }">
                <span :class="{ 'tier-recommended': row.isRecommended }">{{ row.ratio }}</span>
                <el-tag v-if="row.isRecommended" size="small" type="danger" effect="plain" style="margin-left: 4px;">推荐</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rawShares" label="理论股数" align="center" />
            <el-table-column prop="actualShares" label="实际所需股数" align="center" />
            <el-table-column prop="cost" label="所需成本" align="center" />
          </el-table>
          <div class="tier-note">沪市精确算法下，不同持股比例的获配成功率参考。60% 为实操经验值。</div>
        </div>

        <!-- 第三部分：可折叠公式说明 -->
        <el-collapse>
          <el-collapse-item title="计算公式说明">
            <div class="ft-formula">
              <div class="ft-step">① 配售额度</div>
              <div>每股配售额 = 发行规模 ÷ 总股本</div>
              <div>配10张需股数 = 1000 ÷ 每股配售额</div>
              <div class="ft-step">② 股数计算（A股需100股整数倍）</div>
              <div>理论股数 = 配10张需股数 × 手数</div>
              <div>实际购买股数 = ⌈理论股数 ÷ 100⌉ × 100</div>
              <div class="ft-step">③ 资金计算</div>
              <div>最低资金 = 实际购买股数 × 正股价格</div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="沪深配售规则">
            <div class="ft-detail">
              <div><b>沪市：</b>按手申购，1手 = 10张 = 1000元</div>
              <div><b>深市：</b>按张申购，1张 = 100元</div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--el-border-color-lighter);">
                <div style="font-weight: 600; margin-bottom: 4px;">沪市一手党说明</div>
                <div>一手党指只申购 1 手（10 张）可转债的投资者。</div>
                <div>沪市采用精确算法配售，不足1手的尾数按大小排序进位。</div>
                <div>理论最低只需持有 50% 股数（0.5手四舍五入为1手），实操建议持有 60% 以提高成功率。</div>
                <div>实际购买股数 = ⌈配10张需股数 × 60% ÷ 100⌉ × 100（向上取整到100股整数倍）。</div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-dialog>

    <!-- 信号详情弹窗 -->
    <el-dialog
      v-model="signalDialogVisible"
      width="640px"
      :fullscreen="isMobile"
      class="signal-dialog"
    >
      <template #header>
        <div class="dialog-header-stock">
          <div class="dialog-header-left">
            <span class="dialog-stock-title" v-if="signalDetail">
              {{ signalDetail.bondName }} ({{ signalDetail.bondCode }})
            </span>
            <el-tag
              v-if="signalDetail"
              size="small"
              :type="signalTagType(signalDetail, signalDetailTab)"
              effect="light"
              class="dialog-sector-tag"
            >
              {{ signalDetailStrategyLabel }}
            </el-tag>
            <el-tag
              v-if="signalDetail && signalDetail.rating !== '--'"
              size="small"
              type="info"
              effect="light"
              class="dialog-sector-tag"
            >
              {{ signalDetail.rating }}
            </el-tag>
          </div>
          <a
            v-if="signalDetail && signalDetail.stockCode && signalDetail.stockCode !== '--'"
            class="ext-link"
            :href="`https://finance.baidu.com/stock/ab-${signalDetail.stockCode}?openFinScope=1`"
            target="_blank"
            rel="noopener noreferrer"
            title="百度财经行情"
            @click.stop
          >
            <el-icon><TopRight /></el-icon>
          </a>
        </div>
      </template>
      <template v-if="signalDetail">
        <div class="detail-section">
          <div class="detail-section-title">策略指标</div>
          <div class="detail-grid">
            <div
              v-for="col in signalDetailColumns"
              :key="col.key"
              class="detail-item hl-box"
            >
              <span class="detail-label">{{ col.label }}</span>
              <el-tooltip placement="top" trigger="hover" effect="light" :show-after="120" popper-class="formula-popper">
                <template #content>
                  <div class="formula-tip">
                    <div class="ft-formula">{{ col.formula || col.label }}</div>
                    <div class="ft-section">
                      <div class="ft-subtitle">当前数据</div>
                      <div class="ft-detail">{{ col.label }}：<b>{{ col.val(signalDetail) }}</b></div>
                      <div class="ft-detail" v-if="col.example">示例：{{ col.example }}</div>
                    </div>
                    <div v-if="col.note" class="ft-note">{{ col.note }}</div>
                  </div>
                </template>
                <span class="detail-value hover-value" :class="col.cls(signalDetail)" @click.stop>{{ col.val(signalDetail) }}</span>
              </el-tooltip>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">溢价率</span>
              <span class="detail-value" :class="['premium-value', signalDetail.premiumClass]">{{ signalDetail.premium }}</span>
            </div>
            <div class="detail-item hl-box">
              <span class="detail-label">转股价值</span>
              <span class="detail-value hl">{{ signalDetail.conversionValue }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">行情与估值</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">转债价格</span><span class="detail-value hl">{{ signalDetail.price }}</span></div>
            <div class="detail-item"><span class="detail-label">正股价格</span><span class="detail-value">{{ signalDetail.stockPrice }}</span></div>
            <div class="detail-item"><span class="detail-label">转股价</span><span class="detail-value">{{ signalDetail.conversionPrice }}</span></div>
            <div class="detail-item"><span class="detail-label">纯债价值</span><span class="detail-value">{{ signalDetail.pureBondValue }}</span></div>
            <div class="detail-item"><span class="detail-label">到期收益率</span><span class="detail-value" :class="{ positive: signalDetail._ytmRaw != null && signalDetail._ytmRaw > 0, negative: signalDetail._ytmRaw != null && signalDetail._ytmRaw < 0 }">{{ signalDetail.ytm }}</span></div>
            <div class="detail-item"><span class="detail-label">债底折现率</span><span class="detail-value">{{ signalDetail.bondFloorDiscountRate }}</span></div>
            <div class="detail-item"><span class="detail-label">剩余规模</span><span class="detail-value">{{ signalDetail.remainingSize }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">转债信息</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">转债名称</span><span class="detail-value">{{ signalDetail.bondName }}</span></div>
            <div class="detail-item"><span class="detail-label">转债代码</span><span class="detail-value copyable" @click="copyText(signalDetail.bondCode)">{{ signalDetail.bondCode }}</span></div>
            <div class="detail-item"><span class="detail-label">正股名称</span><span class="detail-value">{{ signalDetail.stockName }}</span></div>
            <div class="detail-item"><span class="detail-label">正股代码</span><span class="detail-value copyable" @click="copyText(signalDetail.stockCode)">{{ signalDetail.stockCode || '--' }}</span></div>
            <div class="detail-item">
              <span class="detail-label">交易所</span>
              <span class="detail-value"><ExchangeBadge :exchange="signalDetail.exchange || '--'" /></span>
            </div>
            <div class="detail-item"><span class="detail-label">信用评级</span><span class="detail-value">{{ signalDetail.rating || '--' }}</span></div>
            <div class="detail-item"><span class="detail-label">成交量</span><span class="detail-value">{{ signalDetail.volume }}</span></div>
            <div class="detail-item"><span class="detail-label">成交额</span><span class="detail-value">{{ signalDetail.amount }}</span></div>
            <div class="detail-item"><span class="detail-label">到期日</span><span class="detail-value">{{ signalDetail.maturityDate }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">强赎风险</div>
          <div v-if="signalDetail._conversionPriceRaw > 0" class="risk-block">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">转股价</span><span class="detail-value">{{ signalDetail.conversionPrice }}</span></div>
              <div class="detail-item"><span class="detail-label">强赎触发价</span><span class="detail-value hl">{{ signalDetail.forceTriggerPrice }}</span></div>
              <div class="detail-item"><span class="detail-label">距强赎线</span><span class="detail-value" :class="signalDetail.forceRedemptionClass ? 'warning' : ''">{{ signalDetail.forceRedemptionGap }}</span></div>
              <div class="detail-item"><span class="detail-label">正股价</span><span class="detail-value">{{ signalDetail.stockPrice }}</span></div>
            </div>
            <div class="risk-hint" :class="signalDetail.forceRedemptionClass ? 'risk-warning' : ''">
              <el-icon><Warning v-if="signalDetail._forcePriceGap >= 0" /><Check v-else /></el-icon>
              {{ signalDetail._forcePriceGap >= 0 ? '已接近/触发强赎区域，注意风险' : '处于安全区域' }}
            </div>
          </div>
          <el-empty v-else description="暂无数据" :image-size="60" />
        </div>

        <div class="detail-section">
          <div class="detail-section-title">下修机会</div>
          <div v-if="signalDetail._conversionPriceRaw > 0" class="risk-block">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">转股价</span><span class="detail-value">{{ signalDetail.conversionPrice }}</span></div>
              <div class="detail-item"><span class="detail-label">下修触发价</span><span class="detail-value hl">{{ signalDetail.reviseTriggerPrice }}</span></div>
              <div class="detail-item"><span class="detail-label">距下修线</span><span class="detail-value" :class="signalDetail.downReviseClass ? 'warning' : ''">{{ signalDetail.downReviseGap }}</span></div>
              <div class="detail-item"><span class="detail-label">到期日</span><span class="detail-value">{{ signalDetail.maturityDate }}</span></div>
            </div>
            <div class="risk-hint" :class="signalDetail.downReviseClass ? 'risk-warning' : ''">
              <el-icon><InfoFilled v-if="signalDetail._revisePriceGap < 0" /><Check v-else /></el-icon>
              {{ signalDetail._revisePriceGap < 0 ? '正股已跌破下修线，可能触发下修' : '未触发下修' }}
            </div>
          </div>
          <el-empty v-else description="暂无数据" :image-size="60" />
        </div>

        <div class="detail-section">
          <div class="detail-section-title">操作</div>
          <div class="action-buttons">
            <el-button
              :type="userStore.isFavorite('convertible', signalDetail.bondCode) ? 'warning' : 'default'"
              @click="toggleFav(signalDetail)"
              style="width: 100%"
            >
              <el-icon><StarFilled v-if="userStore.isFavorite('convertible', signalDetail.bondCode)" /><Star v-else /></el-icon>
              {{ userStore.isFavorite('convertible', signalDetail.bondCode) ? '取消自选' : '加入自选' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 公式回忆（检索练习） -->
    <FormulaRecall :items="cbRecallItems" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Star, StarFilled, ArrowDown, TopRight, Calendar, Warning, Check, InfoFilled } from '@element-plus/icons-vue'
import { useConvertibleStore } from '@/stores/convertible'
import { useUserStore } from '@/stores/user'
import TierBadge from '@/components/TierBadge.vue'
import TimeStamp from '@/components/TimeStamp.vue'
import ExchangeBadge from '@/components/ExchangeBadge.vue'
import SensitivitySlider from '@/components/SensitivitySlider.vue'
import FormulaRecall from '@/components/FormulaRecall.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const router = useRouter()
const store = useConvertibleStore()
const userStore = useUserStore()

const tabs = [
  { key: 'placement', label: '配售' },
  { key: 'double_low', label: '双低' },
  { key: 'force_redeem', label: '强赎' },
  { key: 'discount', label: '折价' },
  { key: 'down_revised', label: '下修' }
]

// 策略沙盘（默认展开，避免用户误以为数据缺失）
const sandboxOpen = ref(true)
const cbSandbox = ref({ price: 105, premium: 10, convPrice: 10 })
const cbDoubleLow = computed(() => cbSandbox.value.price + cbSandbox.value.premium)
const cbConvValue = computed(() => {
  const s = cbSandbox.value
  // 转股价值 = 转债价格 / (1 + 溢价率/100)
  // 由溢价率定义反推：溢价率 = (价格 - 转股价值) / 转股价值 × 100%
  return s.convPrice > 0 ? +(s.price / (1 + s.premium / 100)).toFixed(2) : 0
})
const cbStockPrice = computed(() => {
  const s = cbSandbox.value
  // 隐含正股价 = 转股价值 × 转股价 / 100
  return s.convPrice > 0 ? +(cbConvValue.value * s.convPrice / 100).toFixed(2) : 0
})
const cbAdvice = computed(() => {
  const dl = cbDoubleLow.value
  if (dl < 120) return '双低值低，投资价值高'
  if (dl < 130) return '双低值较低，值得关注'
  if (dl < 140) return '双低值中等，谨慎参与'
  return '双低值偏高，建议回避'
})

// 公式回忆
const cbRecallItems = [
  { prompt: '转股价值 = 100 / ____ × 正股价', answer: '转股价', placeholder: '缺失的项' },
  { prompt: '溢价率 = (____ - 转股价值) / 转股价值 × 100%', answer: '转债价格', placeholder: '缺失的项' },
  { prompt: '双低值 = 转债价格 + ____', answer: '溢价率', placeholder: '缺失的项（数值）' },
  { prompt: '强赎线 = 转股价 × ____', answer: '130%', placeholder: '百分比' }
]

const guideMap = {
  placement: '抢权配售：提前买正股获配债权，百元含权越高越划算，安全垫越高越安全',
  double_low: '双低值越小投资价值越高，低于150可入场，低于170可关注',
  force_redeem: '溢价率低于10%且价格105-140，接近强赎触发线，关注转股套利机会',
  discount: '溢价率为负说明转债比转股便宜，可研究转股套利空间',
  down_revised: '高溢价+低价格+短剩余年限，公司下修转股价概率大'
}

const activeTab = ref('placement')
const placementSubTab = ref('all')
const placementSortBy = ref('composite')
const placementSortAsc = ref(false)
const searchKeyword = ref('')
const showAll = ref(false)
const pendingDialogVisible = ref(false)
const pendingDetail = ref(null)
const costDialogVisible = ref(false)
const costDialogRow = ref(null)
const signalDialogVisible = ref(false)
const signalDetail = ref(null)
const signalDetailTab = ref('')
const signalSortBy = ref('doubleLow')
const signalSortAsc = ref(true)
const costTableData = computed(() => {
  const row = costDialogRow.value
  if (!row || !row._sharesPerLotRaw) return []
  const sharesPerLot = row._sharesPerLotRaw
  const perShare = row._perShareRaw
  const stockPrice = row._stockPriceRaw || 0

  return Array.from({ length: 5 }, (_, i) => {
    const n = i + 1
    const theoreticalShares = sharesPerLot * n
    const actualShares = Math.ceil(theoreticalShares / 100) * 100
    const minCost = actualShares * stockPrice
    return {
      lots: n,
      perShare: perShare > 0 ? perShare.toFixed(4) + '元' : '-',
      theoreticalShares: theoreticalShares.toFixed(0) + '股',
      actualShares: actualShares + '股',
      minCost: minCost > 0 ? Math.round(minCost) + '元' : '-'
    }
  })
})
// 一手党多档位成功率参考（仅沪市）
const oneHandTierData = computed(() => {
  const row = costDialogRow.value
  if (!row || row.exchange !== '沪' || !row._sharesFor10Raw) return []
  const sharesFor10 = row._sharesFor10Raw
  const stockPrice = row._stockPriceRaw || 0
  const tiers = [0.5, 0.6, 0.7, 0.8, 1.0]
  return tiers.map(ratio => {
    const rawShares = sharesFor10 * ratio
    const actualShares = Math.ceil(rawShares / 100) * 100
    const cost = actualShares * stockPrice
    return {
      ratio: Math.round(ratio * 100) + '%',
      rawShares: rawShares.toFixed(0) + '股',
      actualShares: actualShares + '股',
      cost: cost > 0 ? Math.round(cost) + '元' : '-',
      isRecommended: ratio === 0.6
    }
  })
})
const premiumRate = ref(20)
const isMobile = ref(false)

const placementSubs = [
  { key: 'all', label: '全部', stat: 'allCount' },
  { key: 'subscribing', label: '申购中', stat: 'subscribingCount' },
  { key: 'pending', label: '待上市', stat: 'pendingListCount' },
  { key: 'approved', label: '审批中', stat: 'approvedCount' }
]

const sortFields = [
  { field: 'safetyPad', label: '安全垫' },
  { field: 'cashRatio', label: '含权' },
  { field: 'tradableAmount', label: '可交易量' }
]

const marketTemp = computed(() => store.marketTemp)
const guideText = computed(() => guideMap[activeTab.value])

function tabCount(key) {
  // 直接从 store 的 signals / pendingList 取数量，不依赖 marketTemp
  if (key === 'placement') return store.pendingList.length
  if (key === 'double_low') return (store.signals.double_low || []).length
  if (key === 'force_redeem') return (store.signals.force_redeem || []).length
  if (key === 'discount') return (store.signals.discount || []).length
  if (key === 'down_revised') return (store.signals.down_revised || []).length
  return 0
}

const placementTabStats = computed(() => {
  const list = store.pendingList
  return {
    allCount: list.length,
    subscribingCount: list.filter(i => i._status === '申购中').length,
    pendingListCount: list.filter(i => i._status === '待上市').length,
    approvedCount: list.filter(i => i._status === '同意注册' || i._status === '上市委通过').length
  }
})

function filterPendingBySub(list, sub) {
  if (sub === 'subscribing') return list.filter(i => i._status === '申购中')
  if (sub === 'pending') return list.filter(i => i._status === '待上市')
  if (sub === 'approved') return list.filter(i => i._status === '同意注册' || i._status === '上市委通过')
  return list
}

function sortPendingBy(list, field, asc) {
  const sorted = [...list].sort((a, b) => {
    let va = 0, vb = 0
    if (field === 'cashRatio') { va = a._cashRatioRaw || 0; vb = b._cashRatioRaw || 0 }
    else if (field === 'safetyPad') { va = a._safetyPadRaw || 0; vb = b._safetyPadRaw || 0 }
    else if (field === 'issueSize') { va = a._issueSizeRaw || 0; vb = b._issueSizeRaw || 0 }
    else if (field === 'tradableAmount') { va = a._tradableAmountRaw || 0; vb = b._tradableAmountRaw || 0 }
    else if (field === 'stockChange') { va = a._stockChangeRaw || 0; vb = b._stockChangeRaw || 0 }
    else if (field === 'composite') { va = a._compositeRankRaw || 0; vb = b._compositeRankRaw || 0 }
    return asc ? va - vb : vb - va
  })
  return sorted
}

function matchSearch(list) {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(item =>
    (item.bondName || '').toLowerCase().includes(kw) ||
    (item.bondCode || '').includes(kw) ||
    (item.stockName || '').toLowerCase().includes(kw) ||
    (item.stockCode || '').includes(kw)
  )
}

const filteredPlacement = computed(() => {
  let list = filterPendingBySub(store.pendingList, placementSubTab.value)
  list = sortPendingBy(list, placementSortBy.value, placementSortAsc.value)
  return matchSearch(list)
})

function getSignalColumnsForTab(tab) {
  if (tab === 'double_low') return [
    { key: 'doubleLow', label: '双低值', width: 90, val: r => r.doubleLow, cls: () => 'hl',
      formula: '双低值 = 转债价格 + 溢价率', example: '价格 105，溢价 5% → 双低 = 110', note: '双低值越低投资价值越高，低于 150 可入场' },
    { key: 'pureBondValue', label: '纯债价值', width: 90, val: r => r.pureBondValue, cls: () => '',
      formula: '纯债价值 = Σ 未来现金流 / (1 + 评级折现率)^t', example: '票息与到期赎回价折现求和', note: '按信用评级档位折现估算，是双低策略的防守参考' },
    { key: 'ytm', label: '到期收益率', width: 100, val: r => r.ytm, cls: r => { if (!r.ytm || r.ytm === '--') return ''; return r.ytm.startsWith('+') ? 'positive' : 'negative' },
      formula: '当前价格 = Σ 未来现金流 / (1 + r)^t，反解 r', example: '以当前转债价格买入并持有到期', note: '高价转债的到期收益率可能为负' }
  ]
  if (tab === 'force_redeem') return [
    { key: 'forceRedemptionGap', label: '距强赎', width: 90, val: r => r.forceRedemptionGap, cls: r => r.forceRedemptionClass,
      formula: '距强赎 = (正股价 - 强赎触发价) / 强赎触发价 × 100%', example: '正股 13，触发价 13 → 距强赎 = 0%', note: '正值表示已进入强赎倒计时' },
    { key: 'conversionPrice', label: '转股价', width: 80, val: r => r.conversionPrice, cls: () => '' },
    { key: 'forceTriggerPrice', label: '强赎触发价', width: 100, val: r => r.forceTriggerPrice, cls: () => 'hl',
      formula: '强赎触发价 = 转股价 × 130%', example: '转股价 10 → 强赎触发价 = 13', note: '正股连续 15/30 日收盘价高于此价触发强赎' }
  ]
  if (tab === 'discount') return [
    { key: 'conversionValue', label: '转股价值', width: 90, val: r => r.conversionValue, cls: () => '',
      formula: '转股价值 = 100 / 转股价 × 正股价', example: '转股价 10，正股 12 → 转股价值 = 120', note: '转股价值高于转债价格即为折价' },
    { key: 'discountSpace', label: '折价空间', width: 90, val: r => r.discountSpace, cls: r => r.discountClass,
      formula: '折价空间 = |溢价率|（溢价率为负时）', example: '溢价率 -5% → 折价空间 = 5%', note: '折价越大，转股套利空间越大' }
  ]
  if (tab === 'down_revised') return [
    { key: 'downReviseGap', label: '距下修', width: 90, val: r => r.downReviseGap, cls: r => r.downReviseClass,
      formula: '距下修 = (正股价 - 下修触发价) / 下修触发价 × 100%', example: '正股 8，触发价 10 → 距下修 = -20%', note: '负值表示正股低于下修触发价' },
    { key: 'ytm', label: '到期收益率', width: 100, val: r => r.ytm, cls: r => { if (!r.ytm || r.ytm === '--') return ''; return r.ytm.startsWith('+') ? 'positive' : 'negative' } },
    { key: 'rating', label: '评级', width: 70, val: r => r.rating, cls: () => '' }
  ]
  return []
}

// 信号 Tab 动态列：按策略显示关键参数
const signalColumns = computed(() => getSignalColumnsForTab(activeTab.value))
const signalDetailColumns = computed(() => getSignalColumnsForTab(signalDetailTab.value || activeTab.value))

const signalDetailStrategyLabel = computed(() => {
  const tab = signalDetailTab.value || activeTab.value
  return tabs.find(t => t.key === tab)?.label || '策略'
})

const signalQuickStats = computed(() => {
  const list = rawSignalList.value
  const shown = signalList.value.length
  return [
    { key: 'total', label: '全部', value: list.length, hot: false },
    { key: 'shown', label: searchKeyword.value ? '匹配' : '当前显示', value: shown, hot: searchKeyword.value && shown > 0 },
    { key: 'favorite', label: '自选', value: list.filter(i => i.isFavorite).length, hot: false }
  ]
})

const signalSortFields = computed(() => {
  if (activeTab.value === 'double_low') return [
    { field: 'doubleLow', label: '双低值' },
    { field: 'premium', label: '溢价率' },
    { field: 'price', label: '价格' },
    { field: 'pureBondValue', label: '纯债价值' },
    { field: 'ytm', label: '到期收益' },
    { field: 'conversionValue', label: '转股价值' },
    { field: 'remainingSize', label: '规模' },
    { field: 'amount', label: '成交额' }
  ]
  if (activeTab.value === 'force_redeem') return [
    { field: 'forceGap', label: '距强赎' },
    { field: 'premium', label: '溢价率' },
    { field: 'price', label: '价格' },
    { field: 'remainingSize', label: '规模' }
  ]
  if (activeTab.value === 'discount') return [
    { field: 'discount', label: '折价空间' },
    { field: 'premium', label: '溢价率' },
    { field: 'conversionValue', label: '转股价值' },
    { field: 'remainingSize', label: '规模' }
  ]
  if (activeTab.value === 'down_revised') return [
    { field: 'reviseGap', label: '距下修' },
    { field: 'price', label: '价格' },
    { field: 'premium', label: '溢价率' },
    { field: 'ytm', label: '到期收益' }
  ]
  return []
})

const rawSignalList = computed(() => store.signals[activeTab.value] || [])
const needShowAll = computed(() => rawSignalList.value.length > 15)

// 视图层按 Tab 类型默认排序（覆盖 store 的 sortByBest）
// - 双低：double_low 升序（值越小越优）
// - 强赎：_forcePriceGap 降序（越接近/已触发强赎排前）
// - 折价：折价空间降序（折价越大排前）
// - 下修：_revisePriceGap 升序（最接近下修排前）
function discountRank(item) {
  const p = item.premiumNum
  // 仅当溢价为负（折价）时计算折价空间，无折价者排末尾
  return p != null && p < 0 ? Math.abs(p) : -1
}

function signalSortDefault(tab) {
  if (tab === 'double_low') return { field: 'doubleLow', asc: true }
  if (tab === 'force_redeem') return { field: 'forceGap', asc: false }
  if (tab === 'discount') return { field: 'discount', asc: false }
  if (tab === 'down_revised') return { field: 'reviseGap', asc: true }
  return { field: 'price', asc: true }
}

function signalSortValue(item, field) {
  if (!item) return 0
  if (field === 'doubleLow') return item.doubleLowNum ?? 9999
  if (field === 'forceGap') return item._forcePriceGap ?? -9999
  if (field === 'discount') return discountRank(item)
  if (field === 'reviseGap') return item._revisePriceGap ?? 9999
  if (field === 'premium') return item.premiumNum ?? 9999
  if (field === 'price') return item.priceNum ?? 0
  if (field === 'ytm') return item._ytmRaw ?? -9999
  if (field === 'pureBondValue') return item._pureBondValueRaw ?? 0
  if (field === 'remainingSize') return item._remainingSizeRaw ?? 0
  if (field === 'conversionValue') return item.conversionValueNum ?? 0
  if (field === 'amount') return item._amountRaw ?? 0
  return 0
}

const sortedSignalList = computed(() => {
  const list = rawSignalList.value
  if (!list || list.length <= 1) return list || []
  const field = signalSortBy.value
  const asc = signalSortAsc.value
  return [...list].sort((a, b) => {
    const va = signalSortValue(a, field)
    const vb = signalSortValue(b, field)
    return asc ? va - vb : vb - va
  })
})

const signalList = computed(() => {
  let list = sortedSignalList.value
  if (!showAll.value && needShowAll.value) list = list.slice(0, 15)
  return matchSearch(list)
})

const currentStageIndex = computed(() => {
  const list = pendingDetail.value?.stageList || []
  const idx = list.findIndex(s => s.status === 'current')
  return idx >= 0 ? idx : 0
})

// 只显示到当前节点（已完成 + 当前），隐藏未来节点
const visibleStageList = computed(() => {
  const list = pendingDetail.value?.stageList || []
  const curIdx = currentStageIndex.value
  return list.slice(0, curIdx + 1).map((s, i) => ({ ...s, _origIndex: i }))
})

const hasFutureStages = computed(() => {
  const list = pendingDetail.value?.stageList || []
  return currentStageIndex.value < list.length - 1
})

const nextStage = computed(() => {
  const list = pendingDetail.value?.stageList || []
  const idx = currentStageIndex.value + 1
  const s = list[idx] || { name: '--', date: '' }
  if (s.date === 'None' || s.date === 'null' || s.date === 'undefined') {
    return { ...s, date: '' }
  }
  return s
})

const currentStage = computed(() => {
  const list = pendingDetail.value?.stageList || []
  return list[currentStageIndex.value] || { name: '--', date: '' }
})

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const regCountdown = computed(() => {
  const d = pendingDetail.value
  if (!d || !d.regDateRaw) return { show: false }
  const diff = daysDiff(d.regDateRaw)
  if (diff === null || diff < 0) return { show: false }
  const date = new Date(d.regDateRaw)
  const weekday = WEEKDAYS[date.getDay()]
  let level = 'normal'
  if (diff === 0) level = 'urgent'
  else if (diff <= 3) level = 'soon'
  else if (diff <= 7) level = 'near'
  return {
    show: true,
    days: diff,
    weekday,
    level,
    isToday: diff === 0,
  }
})

function daysDiff(dateStr) {
  if (!dateStr) return null
  const today = new Date().toISOString().slice(0, 10)
  const diff = Math.ceil((new Date(dateStr) - new Date(today)) / 86400000)
  return Number.isFinite(diff) ? diff : null
}

const liveSafetyPad = computed(() => {
  const sp = pendingDetail.value?._safetyPadRaw || 0
  if (sp <= 0) return '--'
  const newPad = sp * (premiumRate.value / 100 / 0.2)
  return newPad.toFixed(2) + '%'
})

const liveExpectedProfit = computed(() => {
  const profit = 1000 * (premiumRate.value / 100)
  return Math.round(profit) + '元'
})

function switchTab(key) {
  activeTab.value = key
  searchKeyword.value = ''
  showAll.value = false
  if (key !== 'placement') {
    placementSubTab.value = 'all'
    const sort = signalSortDefault(key)
    signalSortBy.value = sort.field
    signalSortAsc.value = sort.asc
  }
}

function switchPlacementSub(sub) {
  placementSubTab.value = sub
}

function toggleSort(field) {
  if (placementSortBy.value === field) {
    placementSortAsc.value = !placementSortAsc.value
  } else {
    placementSortBy.value = field
    placementSortAsc.value = false
  }
}

function toggleSignalSort(field) {
  if (signalSortBy.value === field) {
    signalSortAsc.value = !signalSortAsc.value
  } else {
    signalSortBy.value = field
    signalSortAsc.value = signalSortDefault(activeTab.value).field === field
      ? signalSortDefault(activeTab.value).asc
      : false
  }
}

function openPendingDetail(row) {
  if (!row?.detail) return
  pendingDetail.value = { ...row.detail }
  premiumRate.value = 20
  pendingDialogVisible.value = true
}

function openCostDialog(row) {
  costDialogRow.value = row
  costDialogVisible.value = true
}

function openSignalDetail(row) {
  signalDetail.value = row
  signalDetailTab.value = activeTab.value
  signalDialogVisible.value = true
}

function toggleFav(row) {
  userStore.toggleFavorite('convertible', row.bondCode, row.bondName)
  store.refreshFavorites()
  ElMessage.success(userStore.isFavorite('convertible', row.bondCode) ? '已添加自选' : '已取消自选')
}

function goDetail(code) {
  if (!code) return
  router.push(`/convertible/${code}`)
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败')
  }
}

function formatPremiumMedian(v) {
  if (v == null || v === '--') return '--'
  return v + '%'
}

function riskTagType(cls) {
  return { high: 'success', mid: 'warning', low: 'danger' }[cls] || 'info'
}

function signalTagText(row, tab = activeTab.value) {
  if (!row) return tabs.find(t => t.key === tab)?.label || '策略'
  if (tab === 'double_low') {
    if ((row.doubleLowNum || 9999) < 130) return '双低优选'
    return '双低观察'
  }
  if (tab === 'force_redeem') {
    return row._forcePriceGap >= 0 ? '强赎临界' : '强赎观察'
  }
  if (tab === 'discount') {
    return row.premiumNum < 0 ? '折价套利' : '折价观察'
  }
  if (tab === 'down_revised') {
    return row._revisePriceGap < 0 ? '已破下修线' : '下修观察'
  }
  return tabs.find(t => t.key === tab)?.label || '策略'
}

function signalTagType(row, tab = activeTab.value) {
  if (!row) return 'info'
  if (tab === 'double_low') return (row.doubleLowNum || 9999) < 130 ? 'danger' : 'warning'
  if (tab === 'force_redeem') return row._forcePriceGap >= 0 ? 'success' : 'warning'
  if (tab === 'discount') return row.premiumNum < 0 ? 'danger' : 'warning'
  if (tab === 'down_revised') return row._revisePriceGap < 0 ? 'danger' : 'warning'
  return 'info'
}

function safetyPadClass(raw) {
  if (raw == null) return ''
  if (raw > 8) return 'positive'
  if (raw > 3) return 'warning'
  return 'negative'
}

function trendClass(raw) {
  if (raw > 0) return 'up'
  if (raw < 0) return 'down'
  return ''
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
.convertible-page {
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

            &.low {
              color: var(--el-color-success);
            }

            &.sub {
              font-size: 14px;
              font-weight: 500;
              color: var(--text-color-secondary);
            }
          }
        }

        .result-tip {
          font-size: 12px;
          color: var(--el-color-success);

          &.warn {
            color: var(--el-color-warning);
          }
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

  .tab-content {
    .sub-toolbar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;

      .sub-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sub-btn {
        padding: 4px 12px;
        border: 1px solid var(--el-border-color);
        border-radius: 14px;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        color: var(--text-color-regular);

        .sub-count {
          margin-left: 4px;
          color: var(--text-color-secondary);
          &.hot { color: var(--el-color-danger); }
        }

        &.active {
          border-color: var(--el-color-primary);
          color: var(--el-color-primary);
          background: var(--el-color-primary-light-9);
        }

        &.signal-stat {
          cursor: default;
          opacity: 1;

          &:disabled {
            color: var(--text-color-regular);
          }
        }
      }

      .sort-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sort-btn {
        padding: 4px 10px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        color: var(--text-color-secondary);

        &:hover { color: var(--el-color-primary); }

        &.active {
          color: var(--el-color-primary);
          font-weight: 600;
        }
      }
    }
  }

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

    .bond-name { font-weight: 600; color: var(--text-color); }
    .code-text { color: var(--text-color-secondary); }
    .stock-name { color: var(--text-color-secondary); }
    .code-price { color: var(--text-color-regular); }
    .code-change {
      &.up { color: var(--el-color-danger); }
      &.down { color: var(--el-color-success); }
    }
    .code-sep { color: var(--el-border-color); }
    .progress-tag {
      padding: 0 6px;
      border-radius: 3px;
      font-size: 11px;
      background: var(--el-fill-color);
      &.hot { background: rgba(245, 108, 108, 0.12); color: var(--el-color-danger); }
      &.warm { background: rgba(230, 162, 60, 0.12); color: var(--el-color-warning); }
    }
  }

  /* 评级 tag：推荐绿/可关注黄/谨慎红，兼容暗黑模式 */
  .rating-tag {
    border: none;

    &.rating-recommend {
      background-color: var(--el-color-danger);
      color: #fff;
    }
    &.rating-watch {
      background-color: var(--el-color-warning);
      color: #fff;
    }
    &.rating-caution {
      background-color: var(--el-color-success);
      color: #fff;
    }
  }

  .fav-icon {
    cursor: pointer;
    color: var(--el-border-color);
    font-size: 16px;
    &.active { color: #fadb14; }
    &:hover { color: #fadb14; }
  }

  .hl { color: var(--el-color-primary); font-weight: 600; }
  .price-sub { font-size: 12px; color: var(--text-color-secondary); }

  .quote-cell {
    line-height: 1.4;
  }

  .rating-badge {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    border-radius: 3px;
    font-size: 11px;
    color: var(--text-color-secondary);
    background: var(--el-fill-color);
  }

  .premium-value {
    &.negative { color: var(--el-color-success); }
    &.high { color: var(--el-color-danger); }
  }

  .positive { color: var(--el-color-success); font-weight: 600; }
  .warning { color: var(--el-color-warning); font-weight: 600; }
  .negative { color: var(--el-color-danger); font-weight: 600; }
  .up { color: var(--el-color-danger); }
  .down { color: var(--el-color-success); }

  .sub-info {
    font-size: 12px;
    color: var(--text-color-secondary);
    &.onehand { color: var(--el-color-warning); }
  }

  .cost-cell {
    cursor: pointer;
    &:hover { opacity: 0.8; }
  }

  .cost-value {
    font-weight: 600;
    color: var(--el-color-primary);
  }
  .cost-shares {
    font-weight: 400;
    font-size: 12px;
    color: var(--el-text-color-secondary);
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

  .show-all-bar {
    text-align: center;
    margin-top: 12px;
  }

  .mobile-cards {
    display: none;
  }

  /* 待发详情弹窗 */
  :deep(.pending-dialog) {
    .el-dialog__body {
      max-height: calc(90vh - 120px);
      overflow-y: auto;
      padding-right: 12px;
    }
  }

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

    .detail-label-section {
      font-size: 13px;
      color: var(--text-color-secondary);
    }
  }

  /* 登记日倒计时卡片 */
  .reg-countdown {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(64, 158, 255, 0.02));
    border: 1px solid rgba(64, 158, 255, 0.2);

    &.soon {
      background: linear-gradient(135deg, rgba(230, 162, 60, 0.1), rgba(230, 162, 60, 0.02));
      border-color: rgba(230, 162, 60, 0.25);

      .reg-countdown-icon { color: var(--el-color-warning); }
      .reg-countdown-days { color: var(--el-color-warning); }
    }
    &.near {
      background: linear-gradient(135deg, rgba(103, 194, 58, 0.08), rgba(103, 194, 58, 0.02));
      border-color: rgba(103, 194, 58, 0.2);

      .reg-countdown-icon { color: var(--el-color-success); }
      .reg-countdown-days { color: var(--el-color-success); }
    }
    &.urgent {
      background: linear-gradient(135deg, rgba(245, 108, 108, 0.1), rgba(245, 108, 108, 0.02));
      border-color: rgba(245, 108, 108, 0.25);

      .reg-countdown-icon { color: var(--el-color-danger); }
      .reg-countdown-days { color: var(--el-color-danger); }
    }

    .reg-countdown-icon {
      color: var(--el-color-primary);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.6);
    }

    .reg-countdown-content {
      flex: 1;
      min-width: 0;

      .reg-countdown-title {
        font-size: 13px;
        color: var(--text-color-secondary);
        line-height: 1.4;

        .reg-countdown-days {
          font-size: 20px;
          font-weight: 700;
          color: var(--el-color-primary);
          margin: 0 3px;
          vertical-align: -2px;
        }
      }
      .reg-countdown-sub {
        font-size: 12px;
        color: var(--text-color-tertiary, var(--text-color-secondary));
        margin-top: 2px;
      }
    }

    .reg-countdown-badge {
      flex-shrink: 0;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--el-color-danger);
      background: rgba(245, 108, 108, 0.12);
      border-radius: 12px;
    }
  }

  /* 发行进度节点卡 */
  .stage-progress-info {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;

    .stage-progress-item {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: var(--el-fill-color-light);
      border-radius: 8px;
      position: relative;
      overflow: hidden;

      &.current {
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.02));
        border: 1px solid rgba(64, 158, 255, 0.2);

        .stage-progress-dot {
          background: var(--el-color-primary);
          box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.15);
        }
        .stage-progress-label { color: var(--el-color-primary); }
        .stage-progress-value { color: var(--text-color); }
      }
      &.next {
        background: linear-gradient(135deg, rgba(230, 162, 60, 0.08), rgba(230, 162, 60, 0.02));
        border: 1px dashed rgba(230, 162, 60, 0.3);

        .stage-progress-dot {
          background: var(--el-color-warning);
          box-shadow: 0 0 0 4px rgba(230, 162, 60, 0.15);
        }
        .stage-progress-label { color: var(--el-color-warning); }
        .stage-progress-date { color: var(--el-color-warning); }
      }
    }

    .stage-progress-dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 6px;
      background: var(--el-text-color-secondary);
    }

    .stage-progress-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stage-progress-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-color-secondary);
      letter-spacing: 0.5px;
    }

    .stage-progress-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.3;
    }

    .stage-progress-date {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-color-secondary);
      margin-top: 1px;
    }
  }

  /* 自定义时间轴 */
  .detail-timeline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px 4px 20px;
    position: relative;
    margin-bottom: 8px;

    .timeline-node {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      min-width: 0;

      .timeline-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--el-border-color);
        border: 2px solid var(--el-bg-color);
        position: relative;
        z-index: 2;
        flex-shrink: 0;
        transition: all 0.2s;
      }

      .timeline-line {
        position: absolute;
        top: 5px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: var(--el-border-color-lighter);
        z-index: 1;
      }

      .timeline-label {
        margin-top: 8px;
        text-align: center;
        min-width: 0;
        padding: 0 2px;

        .timeline-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-color-secondary);
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .timeline-date {
          font-size: 11px;
          color: var(--text-color-tertiary, var(--text-color-secondary));
          margin-top: 2px;
          line-height: 1.3;
        }
      }

      &.done {
        .timeline-dot {
          background: var(--el-color-success);
        }
        .timeline-line {
          background: var(--el-color-success);
        }
        .timeline-name {
          color: var(--text-color-secondary);
        }
      }

      &.active {
        .timeline-dot {
          background: var(--el-color-primary);
          transform: scale(1.15);
          box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.15);
        }
        .timeline-name {
          color: var(--el-color-primary);
          font-weight: 600;
        }
      }
    }
  }

  .slider-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .slider-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--el-color-warning);
    }
  }

  .slider-hint {
    font-size: 12px;
    color: var(--text-color-secondary);
    margin-top: 4px;
  }

  .sector-row {
    display: flex;
    align-items: center;
    gap: 8px;
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
        border-bottom: 1px dashed var(--text-color-secondary);
        padding-bottom: 1px;

        &.hl { color: var(--el-color-primary); }
        &.copyable { cursor: pointer; &:hover { color: var(--el-color-primary); } }
      }
    }
  }

  /* 成本弹窗 */
  :deep(.cost-dialog) {
    .el-dialog__body {
      max-height: calc(90vh - 120px);
      overflow-y: auto;
      padding-right: 12px;
    }
  }

  .tier-section {
    margin-bottom: 16px;

    .tier-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
      padding-left: 8px;
      border-left: 3px solid var(--el-color-warning);
    }

    .tier-recommended {
      font-weight: 600;
      color: var(--el-color-warning);
    }

    .tier-note {
      font-size: 12px;
      color: var(--text-color-secondary);
      margin-top: -8px;
      margin-bottom: 8px;
      font-style: italic;
    }
  }

  .cost-dialog-content {
    .ft-formula {
      div + div {
        margin-top: 4px;
      }
    }
  }

  /* 信号详情弹窗 */
  :deep(.signal-dialog) {
    .el-dialog__body {
      max-height: calc(90vh - 120px);
      overflow-y: auto;
      padding-right: 12px;
    }
  }

  .detail-section {
    margin-bottom: 16px;

    .detail-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 10px;
      padding-left: 8px;
      border-left: 3px solid var(--el-color-primary);
    }
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .metric-item {
    background: var(--el-fill-color-light);
    border-radius: 6px;
    padding: 10px;
    text-align: center;

    .metric-label {
      font-size: 12px;
      color: var(--text-color-secondary);
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);

      &.hl { color: var(--el-color-primary); }
      &.positive { color: var(--el-color-success); }
    }
  }

  .risk-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .risk-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--el-color-success);
    padding: 8px 12px;
    background: var(--el-color-success-light-9);
    border-radius: 4px;

    &.risk-warning {
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
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
        .bond-name { font-weight: 600; }
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
          min-width: 40px;
          color: var(--text-color-secondary);
          margin-right: 4px;
        }
      }
    }

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
.dialog-header-stock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .dialog-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .dialog-stock-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .dialog-sector-tag {
    flex-shrink: 0;
    max-width: 140px;
  }

  .ext-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: var(--el-text-color-secondary);
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    .el-icon {
      font-size: 14px;
    }
  }
}

.formula-tip {
  font-size: 12px;
  line-height: 1.65;
  min-width: 300px;
  max-width: 420px;
  color: var(--el-text-color-primary);

  .ft-formula {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 10px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--el-fill-color-light) 86%, #fff 14%);
    border: 1px solid var(--el-border-color-lighter);
    border-left: 3px solid var(--el-text-color-secondary);
    border-radius: 3px;
    letter-spacing: 0;
  }

  .ft-section {
    margin-bottom: 8px;
  }

  .ft-detail {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    color: var(--el-text-color-regular);
    padding: 2px 0;

    b {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      color: var(--el-text-color-primary);
      font-weight: 600;
      background: var(--el-fill-color-lighter);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 3px;
      padding: 0 4px;
      white-space: nowrap;
    }
  }

  .ft-note {
    margin-top: 8px;
    padding: 7px 9px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 3px;
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-secondary);
    font-size: 11px;
    font-style: normal;
  }

  .ft-step {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-top: 10px;
    margin-bottom: 4px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    background: color-mix(in srgb, var(--el-color-primary-light-9) 42%, transparent);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 3px;
  }

  .ft-divider {
    height: 1px;
    background: var(--el-border-color-darker);
    margin: 8px 0;
    opacity: 0.4;
  }

  .ft-subtitle {
    font-weight: 600;
    color: var(--el-text-color-regular);
    margin-bottom: 5px;
    font-size: 11px;
    letter-spacing: 0.04em;
  }
}

.formula-popper.el-popper {
  border: 1px solid var(--el-border-color);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
}
</style>
