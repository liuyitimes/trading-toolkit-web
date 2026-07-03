<template>
  <div class="page-container">
    <div class="page-header">
      <h2>新股申购</h2>
    </div>

    <!-- 市场概览卡片 -->
    <div class="summary-cards" v-if="summary">
      <el-card shadow="hover" class="summary-card">
        <div class="summary-value">{{ summary.upcoming_count ?? 0 }}</div>
        <div class="summary-label">申购中</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-value">{{ summary.recent_count ?? 0 }}</div>
        <div class="summary-label">近期上市</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-value">{{ summary.total ?? 0 }}</div>
        <div class="summary-label">总计</div>
      </el-card>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="申购中" name="upcoming">
        <!-- 桌面表格 -->
        <el-table :data="upcomingList" v-loading="loading" stripe @row-click="goDetail" class="desktop-table">
          <el-table-column prop="code" label="代码" width="100" />
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column label="发行价" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.ipoPrice) }}</template>
          </el-table-column>
          <el-table-column label="发行PE" width="90" align="right">
            <template #default="{ row }">
              <span v-if="row.peRatio && row.peRatio !== '-'">{{ row.peRatio }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="行业PE" width="90" align="right">
            <template #default="{ row }">
              <span v-if="row.industryPe && row.industryPe !== '-'">{{ row.industryPe }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="估值" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.peRating.type" size="small" effect="light">{{ row.peRating.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="applyDate" label="申购日期" width="130" />
        </el-table>

        <!-- 移动端卡片 -->
        <div class="mobile-cards" v-loading="loading">
          <el-card
            v-for="item in upcomingList"
            :key="item.code"
            shadow="hover"
            class="ipo-mobile-card"
            @click="goDetail(item)"
          >
            <div class="card-header-row">
              <span class="card-code">{{ item.code }}</span>
              <span class="card-name">{{ item.name }}</span>
              <el-tag :type="item.peRating.type" size="small" effect="light">{{ item.peRating.label }}</el-tag>
            </div>
            <div class="card-info-row">
              <span>发行价: <b>{{ formatNumber(item.ipoPrice) }}</b></span>
              <span v-if="item.peRatio && item.peRatio !== '-'">PE: {{ item.peRatio }}</span>
              <span v-if="item.industryPe && item.industryPe !== '-'">行业: {{ item.industryPe }}</span>
            </div>
            <div class="card-date">{{ item.applyDate }}</div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="已上市" name="listed">
        <el-table :data="listedList" v-loading="loading" stripe @row-click="goDetail" class="desktop-table">
          <el-table-column prop="code" label="代码" width="100" />
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column label="发行价" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.ipoPrice) }}</template>
          </el-table-column>
          <el-table-column label="发行PE" width="90" align="right">
            <template #default="{ row }">
              <span v-if="row.peRatio && row.peRatio !== '-'">{{ row.peRatio }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="行业PE" width="90" align="right">
            <template #default="{ row }">
              <span v-if="row.industryPe && row.industryPe !== '-'">{{ row.industryPe }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="估值" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.peRating.type" size="small" effect="light">{{ row.peRating.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="listDate" label="上市日期" width="120">
            <template #default="{ row }">{{ row.listDate || '--' }}</template>
          </el-table-column>
          <el-table-column label="中签率" width="90" align="right">
            <template #default="{ row }">
              <span v-if="row.winRate">{{ row.winRate }}%</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 移动端卡片 -->
        <div class="mobile-cards" v-loading="loading">
          <el-card
            v-for="item in listedList"
            :key="item.code"
            shadow="hover"
            class="ipo-mobile-card"
            @click="goDetail(item)"
          >
            <div class="card-header-row">
              <span class="card-code">{{ item.code }}</span>
              <span class="card-name">{{ item.name }}</span>
              <el-tag :type="item.peRating.type" size="small" effect="light">{{ item.peRating.label }}</el-tag>
            </div>
            <div class="card-info-row">
              <span>发行价: <b>{{ formatNumber(item.ipoPrice) }}</b></span>
              <span v-if="item.winRate">中签率: {{ item.winRate }}%</span>
            </div>
            <div class="card-date">上市: {{ item.listDate || '--' }}</div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHkipoStore } from '@/stores/hkipo'
import { formatNumber } from '@/utils/format'

const router = useRouter()
const store = useHkipoStore()
const activeTab = ref('upcoming')
const loading = computed(() => store.loading)

const upcomingList = computed(() => store.upcomingList)
const listedList = computed(() => store.ipoList.filter(i => i.status === 'listed'))
const summary = computed(() => store.summary)

onMounted(() => {
  store.loadSummary()
  store.loadUpcoming()
  store.loadIpoList()
})

function handleTabChange() {
  if (upcomingList.value.length === 0) store.loadUpcoming()
  if (store.ipoList.length === 0) store.loadIpoList()
}

function goDetail(row) {
  router.push(`/hkipo/${row.code}`)
}
</script>

<style lang="scss" scoped>
.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  .summary-card {
    flex: 1;
    text-align: center;

    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--el-color-primary);
    }

    .summary-label {
      font-size: 13px;
      color: var(--text-color-secondary);
      margin-top: 4px;
    }
  }
}

.text-muted {
  color: var(--text-color-secondary);
  font-size: 13px;
}

.desktop-table {
  cursor: pointer;
}

.mobile-cards {
  display: none;
}

.ipo-mobile-card {
  margin-bottom: 12px;
  cursor: pointer;

  .card-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .card-code {
      font-weight: 600;
      color: var(--el-color-primary);
      font-size: 14px;
    }

    .card-name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
    }
  }

  .card-info-row {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-color-secondary);
    margin-bottom: 4px;

    b {
      color: var(--text-color);
    }
  }

  .card-date {
    font-size: 12px;
    color: var(--text-color-secondary);
  }
}

@media (max-width: 768px) {
  .summary-cards {
    flex-direction: column;
    gap: 8px;

    .summary-card {
      .summary-value {
        font-size: 22px;
      }
    }
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: block;
  }
}
</style>
