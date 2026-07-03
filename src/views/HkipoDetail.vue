<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2>{{ detail?.name || '港股打新详情' }}</h2>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="16">
        <el-card shadow="hover" v-loading="loading">
          <template #header>
            <span>基本信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="股票代码">{{ detail?.code || '--' }}</el-descriptions-item>
            <el-descriptions-item label="发行价">{{ formatNumber(detail?.ipoPrice) }}</el-descriptions-item>
            <el-descriptions-item label="每手股数">{{ detail?.lotSize || '--' }}</el-descriptions-item>
            <el-descriptions-item label="入场费">{{ formatMoney(detail?.entryFee) }}</el-descriptions-item>
            <el-descriptions-item label="申购开始">{{ formatDate(detail?.startDate) }}</el-descriptions-item>
            <el-descriptions-item label="申购截止">{{ formatDate(detail?.endDate) }}</el-descriptions-item>
            <el-descriptions-item label="上市日期">{{ formatDate(detail?.listDate) }}</el-descriptions-item>
            <el-descriptions-item label="总募资额">{{ formatMoney(detail?.totalRaise) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>认购数据</span>
          </template>
          <el-empty v-if="!detail?.oversubscription" description="暂无认购数据" />
          <el-descriptions v-else :column="2" border>
            <el-descriptions-item label="超额认购倍数">{{ formatNumber(detail.oversubscription) }}</el-descriptions-item>
            <el-descriptions-item label="孖展倍数">{{ formatNumber(detail.marginRatio) }}</el-descriptions-item>
            <el-descriptions-item label="一手中签率">{{ formatPercent(detail.lotWinningRate) }}</el-descriptions-item>
            <el-descriptions-item label="申购人数">{{ detail.applicants || '--' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>发行流程时间线</span>
          </template>
          <el-timeline v-if="timeline.length > 0">
            <el-timeline-item
              v-for="(item, i) in timeline"
              :key="i"
              :timestamp="item.date"
              :type="item.type || 'primary'"
            >
              {{ item.text }}
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无时间线信息" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="8">
        <el-card shadow="hover">
          <template #header>
            <span>操作</span>
          </template>
          <div class="action-buttons">
            <el-button
              :type="isFav ? 'warning' : 'default'"
              :icon="isFav ? 'StarFilled' : 'Star'"
              @click="toggleFav"
            >
              {{ isFav ? '取消自选' : '加入自选' }}
            </el-button>
          </div>
        </el-card>

        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>
            <span>暗盘行情</span>
          </template>
          <div v-if="detail?.darkTrade" class="dark-trade-info">
            <div class="dark-trade-price">
              <span class="label">暗盘价</span>
              <span class="value" :style="{ color: formatColor(detail.darkTrade.changePct) }">
                {{ formatNumber(detail.darkTrade.price) }}
              </span>
            </div>
            <div class="dark-trade-change">
              <span class="label">涨跌幅</span>
              <span class="value" :style="{ color: formatColor(detail.darkTrade.changePct) }">
                {{ formatPercent(detail.darkTrade.changePct) }}
              </span>
            </div>
          </div>
          <el-empty v-else description="暂无暗盘数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hkipoApi } from '@/api/hkipo'
import { useUserStore } from '@/stores/user'
import { formatNumber, formatPercent, formatMoney, formatDate, formatColor } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const detail = ref(null)
const loading = ref(true)

const isFav = computed(() => userStore.isFavorite('hkipo', route.params.code))

const timeline = computed(() => {
  if (!detail.value) return []
  const items = []
  if (detail.value.startDate) items.push({ date: formatDate(detail.value.startDate), text: '开始申购', type: 'primary' })
  if (detail.value.endDate) items.push({ date: formatDate(detail.value.endDate), text: '截止申购', type: 'warning' })
  if (detail.value.listDate) items.push({ date: formatDate(detail.value.listDate), text: '正式上市', type: 'success' })
  return items
})

onMounted(async () => {
  try {
    const data = await hkipoApi.detail(route.params.code)
    detail.value = data
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})

function toggleFav() {
  userStore.toggleFavorite('hkipo', route.params.code, detail.value?.name)
}
</script>

<style lang="scss" scoped>
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dark-trade-info {
  .label {
    color: var(--text-color-secondary);
    font-size: 13px;
    margin-right: 8px;
  }

  .value {
    font-size: 20px;
    font-weight: 700;
  }

  .dark-trade-price,
  .dark-trade-change {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
}
</style>
