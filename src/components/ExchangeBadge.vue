<template>
  <span
    v-if="displayExchange"
    class="market-badge"
    :class="marketClass"
    :aria-label="marketName"
  >
    {{ displayExchange }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  exchange: { type: [String, Number], default: '' }
})

const markets = {
  '沪': { label: '沪', className: 'market-badge--sh', name: '沪市' },
  sh: { label: '沪', className: 'market-badge--sh', name: '沪市' },
  '上海': { label: '沪', className: 'market-badge--sh', name: '沪市' },
  '深': { label: '深', className: 'market-badge--sz', name: '深市' },
  sz: { label: '深', className: 'market-badge--sz', name: '深市' },
  '深圳': { label: '深', className: 'market-badge--sz', name: '深市' },
  '京': { label: '京', className: 'market-badge--bj', name: '京市' },
  '北': { label: '京', className: 'market-badge--bj', name: '京市' },
  bj: { label: '京', className: 'market-badge--bj', name: '京市' },
  '北京': { label: '京', className: 'market-badge--bj', name: '京市' }
}

const market = computed(() => {
  const value = String(props.exchange ?? '').trim()
  return markets[value] || markets[value.toLowerCase()] || null
})

const displayExchange = computed(() => market.value?.label || String(props.exchange ?? '').trim())
const marketClass = computed(() => market.value?.className || 'market-badge--unknown')
const marketName = computed(() => market.value?.name || displayExchange.value)
</script>

<style lang="scss" scoped>
.market-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  line-height: 1;
  color: #fff;

  &.market-badge--sh { background: #d4380d; }
  &.market-badge--sz { background: #0958d9; }
  &.market-badge--bj { background: #531dab; }
  &.market-badge--unknown { background: var(--el-color-info); }
}
</style>
