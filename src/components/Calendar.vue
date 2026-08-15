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
        <div class="calendar-weekday" v-for="w in weekdays" :key="w">
          {{ w }}
        </div>
        <div
          v-for="(day, i) in days"
          :key="i"
          class="calendar-day"
          :class="{
            'is-today': day.isToday,
            'is-event': day.hasEvent,
            'is-other': !day.isCurrentMonth,
            'is-selected': day.date === selectedDate
          }"
          @click="selectDay(day)"
        >
          <span class="day-num">{{ day.num }}</span>
          <div v-if="day.hasEvent" class="day-badges">
            <span v-for="badge in day.badges" :key="badge" class="day-badge">{{
              badge
            }}</span>
          </div>
        </div>
      </div>
      <div v-if="selectedEvents.length" class="day-events">
        <div class="day-events-title">{{ selectedDate }} 财经事件</div>
        <div
          v-for="(event, i) in selectedEvents"
          :key="i"
          class="day-event-item"
        >
          {{ event.label }}
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
const typeBadges = { ipo_apply: '新', ipo_listing: '上', cb_apply: '债' }
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth())
const selectedDate = ref(null)

function dateKey(yearValue, monthIndex, dayNum) {
  return `${yearValue}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
}

const days = computed(() => {
  const firstDay = new Date(year.value, month.value, 1)
  const lastDay = new Date(year.value, month.value + 1, 0)
  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const today = new Date()
  const result = []

  const prevMonthLastDay = new Date(year.value, month.value, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    result.push({
      num: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
      hasEvent: false,
      badges: []
    })
  }
  for (let i = 1; i <= totalDays; i++) {
    const isToday =
      year.value === today.getFullYear() &&
      month.value === today.getMonth() &&
      i === today.getDate()
    const date = dateKey(year.value, month.value, i)
    const dayEvents = props.events.filter((e) => e.date === date)
    const hasEvent = dayEvents.length > 0
    const badges = [
      ...new Set(dayEvents.map((e) => typeBadges[e.type]).filter(Boolean))
    ]
    result.push({
      num: i,
      isCurrentMonth: true,
      isToday,
      hasEvent,
      badges,
      date
    })
  }
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    result.push({
      num: i,
      isCurrentMonth: false,
      isToday: false,
      hasEvent: false,
      badges: []
    })
  }
  return result
})

const selectedEvents = computed(() =>
  props.events.filter((e) => e.date === selectedDate.value)
)

function selectDay(day) {
  selectedDate.value = day.hasEvent ? day.date : null
}

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

  .day-badges {
    display: flex;
    justify-content: center;
    gap: 3px;
    margin-top: 2px;

    .day-badge {
      font-size: 10px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 3px;
      color: #fff;
      background: var(--el-color-warning);
    }
  }

  &.is-selected {
    outline: 2px solid var(--el-color-primary);
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

.day-events {
  margin-top: 12px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;

  .day-events-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .day-event-item {
    font-size: 13px;
    color: var(--text-color);
    padding: 3px 0;
    display: flex;
    align-items: center;
    gap: 6px;

    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--el-color-warning);
    }
  }
}
</style>
