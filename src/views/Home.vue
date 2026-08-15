<template>
  <div class="page-container">
    <div class="page-header">
      <h2>市场概览</h2>
    </div>

    <el-row :gutter="16">
      <el-col
        :xs="12"
        :sm="12"
        :md="6"
        :lg="6"
        v-for="card in overviewCards"
        :key="card.title"
      >
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
import { ref, onMounted, onUnmounted } from 'vue'
import Card from '@/components/Card.vue'
import Calendar from '@/components/Calendar.vue'
import SentimentGauge from '@/components/SentimentGauge.vue'
import { marketApi } from '@/api/market'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const overviewCards = ref([])
const sentiment = ref({ value: 50, level: '中性', description: '市场情绪中性' })
const calendarEvents = ref([])

async function loadAll({ refresh = false } = {}) {
  const requestParams = refresh ? { refresh: true } : {}
  let loaded = false
  let failed = false
  try {
    const data = await marketApi.overview(requestParams)
    loaded = true
    // 后端返回 {convertible_bond, lof_fund, market_sentiment, fund_flow}
    const cb = data.convertible_bond || {}
    const lof = data.lof_fund || {}
    overviewCards.value = [
      {
        title: '可转债',
        value: cb.count || '--',
        subtitle: '上市交易',
        icon: 'TrendCharts',
        color: '#409eff'
      },
      {
        title: 'LOF 基金',
        value: lof.count || '--',
        subtitle: '套利机会',
        icon: 'Money',
        color: '#67c23a'
      },
      {
        title: '市场温度',
        value: cb.double_low_median != null ? cb.double_low_median : '--',
        subtitle: cb.market_status || '当前热度',
        icon: 'DataBoard',
        color: '#f56c6c'
      }
    ]
  } catch {
    failed = true
    if (!refresh || !overviewCards.value.length) {
      overviewCards.value = [
        {
          title: '可转债',
          value: '--',
          subtitle: '上市交易',
          icon: 'TrendCharts',
          color: '#409eff'
        },
        {
          title: 'LOF 基金',
          value: '--',
          subtitle: '套利机会',
          icon: 'Money',
          color: '#67c23a'
        },
        {
          title: '市场温度',
          value: '--',
          subtitle: '当前热度',
          icon: 'DataBoard',
          color: '#f56c6c'
        }
      ]
    }
  }

  try {
    const s = await marketApi.sentiment(requestParams)
    loaded = true
    sentiment.value = {
      value: s.value ?? 50,
      level: s.level || '中性',
      description: s.description || '市场情绪中性'
    }
  } catch {
    failed = true
  }

  try {
    const flow = await marketApi.fundFlow(requestParams)
    loaded = true
    if (flow.items) {
      calendarEvents.value = flow.items
        .map((f) => ({ date: f.date, label: f.label || '' }))
        .filter((f) => f.date)
    }
  } catch {
    failed = true
  }

  if (loaded && !failed) appStore.setLastUpdated()
  return loaded && !failed
}

let unregisterRefresh
onMounted(() => {
  unregisterRefresh = appStore.registerPageRefresh('/home', loadAll)
  loadAll()
})

onUnmounted(() => {
  unregisterRefresh?.()
})
</script>
