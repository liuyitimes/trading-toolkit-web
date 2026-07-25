<template>
  <div
    v-if="currentBatch.length"
    class="quote-barrage"
    data-testid="quote-barrage"
  >
    <div class="barrage-track" :key="batchId" @animationend="finishBatch">
      <span
        v-for="(quote, index) in currentBatch"
        :key="`${batchId}-${index}`"
        class="barrage-text"
        data-testid="quote-barrage-item"
      >
        "{{ quote.text }}" —— {{ quote.author }}
      </span>
    </div>
    <el-button
      class="barrage-close"
      circle
      text
      aria-label="关闭名言弹幕"
      title="关闭名言弹幕"
      @click="$emit('close')"
    >
      <el-icon><Close /></el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  quotes: {
    type: Array,
    default: () => []
  },
  routeKey: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])

const currentBatch = ref([])
const batchId = ref(0)
const hasPendingQuoteUpdate = ref(false)
let nextBatchTimer

function selectBatch(quotes) {
  const shuffled = [...quotes]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ]
  }
  const size =
    shuffled.length < 3 ? shuffled.length : 2 + Math.floor(Math.random() * 2)
  return shuffled.slice(0, size)
}

function startBatch(quotes = props.quotes) {
  window.clearTimeout(nextBatchTimer)
  currentBatch.value = selectBatch(quotes)
  batchId.value += 1
  hasPendingQuoteUpdate.value = false
}

function finishBatch() {
  window.clearTimeout(nextBatchTimer)
  nextBatchTimer = window.setTimeout(() => startBatch(), 4000)
}

watch(
  () => props.routeKey,
  () => {
    if (!hasPendingQuoteUpdate.value) startBatch()
  },
  { flush: 'post' }
)

watch(
  () => props.quotes,
  () => {
    if (currentBatch.value.length) hasPendingQuoteUpdate.value = true
  },
  { deep: true }
)

onMounted(() => startBatch())
onBeforeUnmount(() => window.clearTimeout(nextBatchTimer))
</script>

<style lang="scss" scoped>
.quote-barrage {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  height: 28px;
  line-height: 28px;
  background: rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

:root.dark .quote-barrage {
  background: rgba(255, 255, 255, 0.04);
}

.barrage-track {
  display: inline-block;
  min-width: max-content;
  animation: marquee 24s linear;
  font-size: 13px;
  color: var(--text-color-secondary);
  padding-left: 100%;
}

.barrage-text + .barrage-text::before {
  content: '|';
  margin: 0 16px;
  opacity: 0.3;
}

.barrage-close {
  position: absolute;
  right: 8px;
  top: 2px;
  pointer-events: auto;
  color: var(--text-color-secondary);
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  .quote-barrage {
    display: none;
  }
}
</style>
