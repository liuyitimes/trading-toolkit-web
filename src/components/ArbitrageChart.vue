<template>
  <div class="arbitrage-chart">
    <div class="chart-header">
      <span class="chart-title">套利资金趋势</span>
      <span v-if="prediction?.data_source === 'mock'" class="mock-badge">示例数据</span>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas" class="chart-canvas"></canvas>
      <div class="chart-tooltip" v-if="tooltipVisible" :style="tooltipStyle">
        <div class="tt-date">{{ tooltipData.date }}</div>
        <div class="tt-item">成交额: {{ tooltipData.amount }}万</div>
        <div class="tt-item">新增资金: {{ tooltipData.fund }}万</div>
        <div class="tt-item" v-if="tooltipData.people">套利人数: {{ tooltipData.people }}人</div>
      </div>
    </div>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-bar"></span> 成交额(万)</span>
      <span class="legend-item"><span class="legend-line"></span> 新增资金(万)</span>
      <span class="legend-item"><span class="legend-dashed"></span> 明日预测</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  history: { type: Array, default: () => [] },
  predictedFund: { type: Number, default: null },
})

const chartCanvas = ref(null)
const tooltipVisible = ref(false)
const tooltipData = ref({ date: '', amount: 0, fund: 0, people: null, x: 0, y: 0 })

let ctx = null
let animationId = null
let points = []

const tooltipStyle = computed(() => ({
  left: tooltipData.value.x + 'px',
  top: tooltipData.value.y + 'px',
}))

function drawChart() {
  if (!chartCanvas.value) return
  const canvas = chartCanvas.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * dpr
  canvas.height = canvas.offsetHeight * dpr
  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const width = canvas.offsetWidth
  const height = canvas.offsetHeight
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  if (!props.history || props.history.length === 0) {
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px -apple-system'
    ctx.textAlign = 'center'
    ctx.fillText('暂无数据', width / 2, height / 2)
    return
  }

  const history = props.history.slice(-7)
  const amounts = history.map(h => h.amount || 0)
  const funds = history.map(h => h.arbitrage_fund || 0)
  
  const allValues = [...amounts, ...funds, props.predictedFund || 0]
  const maxValue = Math.max(...allValues, 1)
  const minValue = Math.min(0, ...funds)
  const valueRange = maxValue - minValue

  const barWidth = Math.min(30, chartWidth / history.length * 0.6)
  const gap = chartWidth / history.length

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()

    const value = maxValue - (maxValue - minValue) * (i / 4)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px -apple-system'
    ctx.textAlign = 'right'
    ctx.fillText(value >= 1000 ? (value / 1000).toFixed(1) + 'k' : Math.round(value), padding.left - 8, y + 4)
  }

  ctx.fillStyle = '#9ca3af'
  ctx.font = '11px -apple-system'
  ctx.textAlign = 'center'
  history.forEach((h, i) => {
    const x = padding.left + gap * i + gap / 2
    const date = h.date ? h.date.slice(5) : ''
    ctx.fillText(date, x, height - 10)
  })

  points = []
  history.forEach((h, i) => {
    const x = padding.left + gap * i + gap / 2
    const amount = h.amount || 0
    const fund = h.arbitrage_fund || 0

    const barHeight = amount > 0 ? (amount / valueRange) * chartHeight : 0
    const barY = padding.top + chartHeight - barHeight
    
    const gradient = ctx.createLinearGradient(x - barWidth / 2, barY, x - barWidth / 2, padding.top + chartHeight)
    gradient.addColorStop(0, '#7c5cff')
    gradient.addColorStop(1, '#a78bfa')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x - barWidth / 2, barY, barWidth, barHeight, 4)
    ctx.fill()

    const lineY = padding.top + chartHeight - ((fund - minValue) / valueRange) * chartHeight
    points.push({ x, y: lineY, date: h.date, amount, fund, people: h.arbitrage_people })
  })

  ctx.strokeStyle = '#34d4b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()

  ctx.fillStyle = '#34d4b8'
  points.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  if (props.predictedFund != null && points.length > 0) {
    const lastPoint = points[points.length - 1]
    const nextX = padding.left + gap * history.length + gap / 2
    const predY = padding.top + chartHeight - ((props.predictedFund - minValue) / valueRange) * chartHeight

    ctx.strokeStyle = '#f5a623'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(nextX, predY)
    ctx.stroke()
    ctx.setLineDash([])

    const predBarHeight = props.predictedFund > 0 ? (props.predictedFund / valueRange) * chartHeight : 0
    const predBarY = padding.top + chartHeight - predBarHeight
    
    ctx.fillStyle = 'rgba(245, 166, 35, 0.3)'
    ctx.strokeStyle = '#f5a623'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.roundRect(nextX - barWidth / 2, predBarY, barWidth, predBarHeight, 4)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#f5a623'
    ctx.beginPath()
    ctx.arc(nextX, predY, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f5a623'
    ctx.font = 'bold 11px -apple-system'
    ctx.textAlign = 'center'
    ctx.fillText('预测', nextX, padding.top + 12)
  }
}

function handleMouseMove(e) {
  if (!chartCanvas.value || !points.length) return
  const rect = chartCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  let closest = null
  let minDist = 30
  points.forEach(p => {
    const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
    if (dist < minDist) {
      minDist = dist
      closest = p
    }
  })

  if (closest) {
    tooltipVisible.value = true
    tooltipData.value = {
      ...closest,
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 60
    }
  } else {
    tooltipVisible.value = false
  }
}

function handleMouseLeave() {
  tooltipVisible.value = false
}

watch(() => [props.history, props.predictedFund], drawChart, { deep: true })

onMounted(() => {
  drawChart()
  window.addEventListener('resize', drawChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', drawChart)
})
</script>

<style scoped>
.arbitrage-chart {
  width: 100%;
  min-height: 200px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.mock-badge {
  font-size: 11px;
  color: var(--el-color-warning);
  background: rgba(245, 166, 35, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}
.chart-container {
  position: relative;
  width: 100%;
  height: 180px;
}
.chart-canvas {
  width: 100%;
  height: 100%;
}
.chart-tooltip {
  position: absolute;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}
.tt-date {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
}
.tt-item {
  color: var(--el-text-color-regular);
  margin: 2px 0;
}
.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-bar {
  width: 12px;
  height: 8px;
  background: linear-gradient(180deg, #7c5cff, #a78bfa);
  border-radius: 2px;
}
.legend-line {
  width: 12px;
  height: 2px;
  background: #34d4b8;
}
.legend-dashed {
  width: 12px;
  height: 2px;
  background: #f5a623;
  background-image: repeating-linear-gradient(
    to right,
    #f5a623,
    #f5a623 4px,
    transparent 4px,
    transparent 8px
  );
}
</style>
