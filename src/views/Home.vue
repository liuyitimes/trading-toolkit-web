<template>
  <div class="page-container">
    <QuoteCarousel :quotes="quotes" />

    <div class="page-header">
      <h2>市场概览</h2>
    </div>

    <el-row :gutter="16">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" v-for="card in overviewCards" :key="card.title">
        <Card
          :title="card.title"
          :value="card.value"
          :subtitle="card.subtitle"
          :icon="card.icon"
          :color="card.color"
        />
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px">
      <el-col :xs="24" :md="8">
        <SentimentGauge
          :value="sentiment.value"
          :level="sentiment.level"
          :description="sentiment.description"
        />
      </el-col>
      <el-col :xs="24" :md="16">
        <Calendar :events="calendarEvents" />
      </el-col>
    </el-row>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Card from '@/components/Card.vue'
import QuoteCarousel from '@/components/QuoteCarousel.vue'
import Calendar from '@/components/Calendar.vue'
import SentimentGauge from '@/components/SentimentGauge.vue'
import { marketApi } from '@/api/market'
import { quoteManager } from '@/utils/quoteManager'

const overviewCards = ref([])
const sentiment = ref({ value: 50, level: '中性', description: '市场情绪中性' })
const calendarEvents = ref([])

const quotes = ref(quoteManager.getQuotes())

onMounted(async () => {
  try {
    const data = await marketApi.overview()
    // 后端返回 {convertible_bond, lof_fund, hk_ipo, market_sentiment, fund_flow}
    const cb = data.convertible_bond || {}
    const lof = data.lof_fund || {}
    const hk = data.hk_ipo || {}
    overviewCards.value = [
      { title: '可转债', value: cb.count || '--', subtitle: '上市交易', icon: 'TrendCharts', color: '#409eff' },
      { title: 'LOF 基金', value: lof.count || '--', subtitle: '套利机会', icon: 'Money', color: '#67c23a' },
      { title: '港股 IPO', value: hk.upcoming_count || '--', subtitle: '即将申购', icon: 'Ship', color: '#e6a23c' },
      { title: '市场温度', value: cb.double_low_median != null ? cb.double_low_median : '--', subtitle: cb.market_status || '当前热度', icon: 'DataBoard', color: '#f56c6c' }
    ]
  } catch {
    overviewCards.value = [
      { title: '可转债', value: '--', subtitle: '上市交易', icon: 'TrendCharts', color: '#409eff' },
      { title: 'LOF 基金', value: '--', subtitle: '套利机会', icon: 'Money', color: '#67c23a' },
      { title: '港股 IPO', value: '--', subtitle: '申购中', icon: 'Ship', color: '#e6a23c' },
      { title: '市场温度', value: '--', subtitle: '当前热度', icon: 'DataBoard', color: '#f56c6c' }
    ]
  }

  try {
    const s = await marketApi.sentiment()
    sentiment.value = {
      value: s.value ?? 50,
      level: s.level || '中性',
      description: s.description || '市场情绪中性'
    }
  } catch {}

  try {
    const flow = await marketApi.fundFlow()
    if (flow.items) {
      calendarEvents.value = flow.items.map(f => ({ date: f.date, label: f.label || '' })).filter(f => f.date)
    }
  } catch {}
})
</script>
