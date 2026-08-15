<template>
  <el-card
    shadow="hover"
    class="stat-card"
    :class="{ clickable: !!to }"
    @click="handleClick"
  >
    <div class="card-content">
      <div class="card-info">
        <div class="card-title">{{ title }}</div>
        <div class="card-value" :style="{ color: color }">{{ value }}</div>
        <div v-if="subtitle" class="card-subtitle">{{ subtitle }}</div>
      </div>
      <div v-if="icon" class="card-icon">
        <el-icon :size="40" :color="iconColor || '#409eff'">
          <component :is="icon" />
        </el-icon>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '' },
  value: { type: [String, Number], default: '--' },
  subtitle: { type: String, default: '' },
  icon: { type: [String, Object], default: null },
  color: { type: String, default: '' },
  iconColor: { type: String, default: '' },
  to: { type: String, default: '' }
})

const router = useRouter()
function handleClick() {
  if (props.to) router.push(props.to)
}
</script>

<style lang="scss" scoped>
.stat-card {
  --el-card-padding: 16px;

  .card-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-title {
    font-size: 14px;
    color: var(--text-color-secondary);
    margin-bottom: 8px;
  }

  .card-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .card-subtitle {
    font-size: 12px;
    color: var(--text-color-secondary);
    margin-top: 4px;
  }

  &.clickable {
    cursor: pointer;
    transition: transform 0.15s;

    &:hover {
      transform: translateY(-2px);
    }
  }
}
</style>
