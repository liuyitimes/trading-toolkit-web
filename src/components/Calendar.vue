<template>
  <el-card class="calendar-card">
    <template #header>
      <span class="calendar-header">
        <el-icon><Calendar /></el-icon>
        财经日历
      </span>
    </template>
    <div class="calendar-body">
      <div class="calendar-nav">
        <el-button text @click="prevMonth">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <span class="calendar-title">{{ year }}年{{ month + 1 }}月</span>
        <el-button text @click="nextMonth">
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday" v-for="w in weekdays" :key="w">{{ w }}</div>
        <div
          v-for="(day, i) in days"
          :key="i"
          class="calendar-day"
          :class="{ 'is-today': day.isToday, 'is-event': day.hasEvent, 'is-other': !day.isCurrentMonth }"
        >
          <span class="day-num">{{ day.num }}</span>
          <div v-if="day.hasEvent" class="day-event">{{ day.eventLabel }}</div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  }
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth())

const days = computed(() => {
  const firstDay = new Date(year.value, month.value, 1)
  const lastDay = new Date(year.value, month.value + 1, 0)
  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const today = new Date()
  const result = []

  const prevMonthLastDay = new Date(year.value, month.value, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    result.push({ num: prevMonthLastDay - i, isCurrentMonth: false, isToday: false, hasEvent: false })
  }
  for (let i = 1; i <= totalDays; i++) {
    const isToday = year.value === today.getFullYear() && month.value === today.getMonth() && i === today.getDate()
    const hasEvent = props.events.some(e => {
      const d = new Date(e.date)
      return d.getFullYear() === year.value && d.getMonth() === month.value && d.getDate() === i
    })
    const eventLabel = hasEvent ? '📌' : ''
    result.push({ num: i, isCurrentMonth: true, isToday, hasEvent, eventLabel })
  }
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    result.push({ num: i, isCurrentMonth: false, isToday: false, hasEvent: false })
  }
  return result
})

function prevMonth() {
  if (month.value === 0) {
    year.value--
    month.value = 11
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 11) {
    year.value++
    month.value = 0
  } else {
    month.value++
  }
}
</script>

<style lang="scss" scoped>
.calendar-card {
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;

  .calendar-title {
    font-size: 15px;
    font-weight: 600;
    min-width: 100px;
    text-align: center;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
}

.calendar-weekday {
  font-size: 12px;
  color: var(--text-color-secondary);
  padding: 4px 0;
  font-weight: 600;
}

.calendar-day {
  padding: 4px 0;
  font-size: 13px;
  min-height: 36px;
  cursor: pointer;
  border-radius: 4px;

  .day-num {
    display: block;
  }

  .day-event {
    font-size: 10px;
    line-height: 1;
  }

  &.is-today .day-num {
    background: var(--el-color-primary);
    color: #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &.is-other {
    color: var(--text-color-secondary);
    opacity: 0.4;
  }
}
</style>
