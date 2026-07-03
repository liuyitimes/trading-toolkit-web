<template>
  <div class="page-container">
    <div class="page-header">
      <h2>港股打新</h2>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="申购中" name="upcoming">
        <el-table :data="upcomingList" v-loading="upcomingLoading" stripe @row-click="goDetail">
          <el-table-column prop="code" label="代码" width="100" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="priceRange" label="发行价区间" width="140">
            <template #default="{ row }">{{ row.priceRange || '--' }}</template>
          </el-table-column>
          <el-table-column prop="lotSize" label="每手股数" width="100" align="right">
            <template #default="{ row }">{{ row.lotSize || '--' }}</template>
          </el-table-column>
          <el-table-column prop="startDate" label="申购开始" width="110">
            <template #default="{ row }">{{ formatDate(row.startDate) }}</template>
          </el-table-column>
          <el-table-column prop="endDate" label="申购截止" width="110">
            <template #default="{ row }">{{ formatDate(row.endDate) }}</template>
          </el-table-column>
          <el-table-column prop="listDate" label="上市日" width="110">
            <template #default="{ row }">{{ formatDate(row.listDate) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="待上市" name="pending">
        <el-table :data="pendingList" stripe @row-click="goDetail">
          <el-table-column prop="code" label="代码" width="100" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="listDate" label="上市日" width="110">
            <template #default="{ row }">{{ formatDate(row.listDate) }}</template>
          </el-table-column>
          <el-table-column prop="ipoPrice" label="发行价" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.ipoPrice) }}</template>
          </el-table-column>
          <el-table-column label="暗盘行情" min-width="200">
            <template #default="{ row }">
              <span v-if="row.darkTrade">
                <span :style="{ color: formatColor(row.darkTrade.changePct) }">
                  {{ formatNumber(row.darkTrade.price) }}
                  ({{ formatPercent(row.darkTrade.changePct) }})
                </span>
              </span>
              <span v-else class="text-muted">暂无</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="已上市" name="listed">
        <el-table :data="listedList" stripe @row-click="goDetail">
          <el-table-column prop="code" label="代码" width="100" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="listDate" label="上市日" width="110">
            <template #default="{ row }">{{ formatDate(row.listDate) }}</template>
          </el-table-column>
          <el-table-column prop="ipoPrice" label="发行价" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.ipoPrice) }}</template>
          </el-table-column>
          <el-table-column prop="firstDayReturn" label="首日涨幅" width="100" align="right">
            <template #default="{ row }">
              <span :style="{ color: formatColor(row.firstDayReturn) }">{{ formatPercent(row.firstDayReturn) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="currentPrice" label="最新价" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.currentPrice) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHkipoStore } from '@/stores/hkipo'
import { formatNumber, formatPercent, formatDate, formatColor } from '@/utils/format'

const router = useRouter()
const store = useHkipoStore()
const activeTab = ref('upcoming')

const upcomingList = computed(() => store.upcomingList)
const pendingList = computed(() => store.ipoList.filter(i => i.status === 'upcoming'))
const listedList = computed(() => store.ipoList.filter(i => i.status === 'listed'))
const upcomingLoading = ref(false)

onMounted(() => {
  store.loadUpcoming()
  store.loadIpoList()
})

function handleTabChange(tab) {
  if (tab === 'upcoming' && upcomingList.value.length === 0) {
    store.loadUpcoming()
  } else if (store.ipoList.length === 0) {
    store.loadIpoList()
  }
}

function goDetail(row) {
  router.push(`/hkipo/${row.code}`)
}
</script>

<style lang="scss" scoped>
.text-muted {
  color: var(--text-color-secondary);
  font-size: 13px;
}
</style>
