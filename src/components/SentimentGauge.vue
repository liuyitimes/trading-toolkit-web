<template>
  <el-card class="sentiment-card">
    <template #header>
      <span class="sentiment-header">
        <el-icon><DataAnalysis /></el-icon>
        市场情绪
      </span>
    </template>
    <div class="sentiment-body">
      <div class="gauge-wrapper">
        <div class="gauge-bar">
          <div class="gauge-track">
            <div
              class="gauge-fill"
              :style="{ width: fillPercent + '%', background: fillColor }"
            ></div>
          </div>
        </div>
        <div class="gauge-labels">
          <span>恐慌</span>
          <span class="gauge-value" :style="{ color: fillColor }">{{ level }}</span>
          <span>贪婪</span>
        </div>
      </div>
      <div v-if="description" class="sentiment-desc">{{ description }}</div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 50 },
  level: { type: String, default: '中性' },
  description: { type: String, default: '' }
})

const fillPercent = computed(() => Math.max(0, Math.min(100, props.value)))
const fillColor = computed(() => {
  if (props.value <= 25) return '#f56c6c'
  if (props.value <= 45) return '#e6a23c'
  if (props.value <= 55) return '#909399'
  if (props.value <= 75) return '#409eff'
  return '#67c23a'
})
</script>

<style lang="scss" scoped>
.sentiment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.sentiment-body {
  text-align: center;
}

.gauge-wrapper {
  padding: 10px 0;
}

.gauge-track {
  height: 8px;
  background: linear-gradient(to right, #f56c6c, #e6a23c, #909399, #409eff, #67c23a);
  border-radius: 4px;
  position: relative;
  overflow: hidden;

  .gauge-fill {
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
    background: var(--bg-color);
    transition: width 0.5s ease;
  }
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-color-secondary);

  .gauge-value {
    font-size: 18px;
    font-weight: 700;
  }
}

.sentiment-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-color-secondary);
}
</style>
