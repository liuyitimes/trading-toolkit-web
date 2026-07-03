<template>
  <div class="quote-barrage">
    <div class="barrage-inner">
      <span class="barrage-text" v-for="(q, i) in displayList" :key="i">
        📢 "{{ q.text }}" —— {{ q.author }}
        <span class="barrage-sep">|</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  quotes: {
    type: Array,
    default: () => [
      { text: '别人贪婪我恐惧，别人恐惧我贪婪。', source: '巴菲特' },
      { text: '投资有风险，入市需谨慎。', source: '风险提示' }
    ]
  }
})

const displayList = computed(() => {
  const list = [...props.quotes]
  while (list.length < 4) list.push(...props.quotes)
  return list
})
</script>

<style lang="scss" scoped>
.quote-barrage {
  position: sticky;
  top: 0;
  z-index: 10;
  overflow: hidden;
  white-space: nowrap;
  height: 28px;
  line-height: 28px;
  margin: 0 -20px;
  background: rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(4px);
}

:root.dark .quote-barrage {
  background: rgba(255, 255, 255, 0.04);
}

.barrage-inner {
  display: inline-block;
  animation: marquee 40s linear infinite;
  font-size: 13px;
  color: var(--text-color-secondary);
  padding-left: 100%;
}

.barrage-sep {
  margin: 0 16px;
  opacity: 0.3;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
