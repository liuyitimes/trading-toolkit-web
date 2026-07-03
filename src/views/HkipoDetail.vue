<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h2>{{ detail?.name || '新股详情' }}</h2>
    </div>

    <div v-loading="loading">
      <template v-if="detail">
        <el-row :gutter="16">
          <el-col :xs="24" :md="16">
            <!-- 基本信息 -->
            <el-card shadow="hover">
              <template #header>
                <div class="section-header">
                  <el-icon><InfoFilled /></el-icon>
                  <span>基本信息</span>
                </div>
              </template>
              <el-descriptions :column="{ xs: 1, sm: 2 }" border>
                <el-descriptions-item label="股票代码">{{ detail.code }}</el-descriptions-item>
                <el-descriptions-item label="股票名称">{{ detail.name }}</el-descriptions-item>
                <el-descriptions-item label="发行价格">{{ formatNumber(detail.ipoPrice) }} 元</el-descriptions-item>
                <el-descriptions-item label="申购日期">{{ detail.applyDate || '--' }}</el-descriptions-item>
                <el-descriptions-item label="上市日期">{{ detail.listDate || '未上市' }}</el-descriptions-item>
                <el-descriptions-item label="中签率">
                  <span v-if="detail.winRate">{{ detail.winRate }}%</span>
                  <span v-else class="text-muted">暂无</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 估值分析 -->
            <el-card shadow="hover" style="margin-top: 16px">
              <template #header>
                <div class="section-header">
                  <el-icon><DataAnalysis /></el-icon>
                  <span>估值分析</span>
                </div>
              </template>
              <div class="pe-comparison">
                <div class="pe-item">
                  <div class="pe-label">发行 PE</div>
                  <div class="pe-value">{{ detail.peRatio && detail.peRatio !== '-' ? detail.peRatio : '--' }}</div>
                </div>
                <div class="pe-divider">vs</div>
                <div class="pe-item">
                  <div class="pe-label">行业 PE</div>
                  <div class="pe-value">{{ detail.industryPe && detail.industryPe !== '-' ? detail.industryPe : '--' }}</div>
                </div>
                <div class="pe-item">
                  <div class="pe-label">差值</div>
                  <div class="pe-value" :class="peDiffClass">
                    {{ detail.peDiff > 0 ? '+' : '' }}{{ detail.peDiff }}
                  </div>
                </div>
                <div class="pe-item">
                  <div class="pe-label">估值评级</div>
                  <el-tag :type="detail.peRating.type" size="large" effect="light">{{ detail.peRating.label }}</el-tag>
                </div>
              </div>
              <div class="pe-hint">
                <el-icon><InfoFilled /></el-icon>
                <span v-if="detail.peDiff < 0">发行 PE 低于行业 PE，估值相对偏低，具有一定安全边际。</span>
                <span v-else-if="detail.peDiff <= 5">发行 PE 接近行业 PE，估值合理。</span>
                <span v-else>发行 PE 高于行业 PE，估值偏高，需关注溢价风险。</span>
              </div>
            </el-card>

            <!-- 时间线 -->
            <el-card shadow="hover" style="margin-top: 16px">
              <template #header>
                <div class="section-header">
                  <el-icon><Clock /></el-icon>
                  <span>重要日期</span>
                </div>
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
              <el-empty v-else description="暂无日期信息" :image-size="80" />
            </el-card>
          </el-col>

          <el-col :xs="24" :md="8">
            <!-- 操作 -->
            <el-card shadow="hover">
              <template #header>
                <div class="section-header">
                  <el-icon><Operation /></el-icon>
                  <span>操作</span>
                </div>
              </template>
              <div class="action-buttons">
                <el-button
                  :type="isFav ? 'warning' : 'default'"
                  @click="toggleFav"
                  style="width: 100%"
                >
                  <el-icon><Star v-if="!isFav" /><StarFilled v-else /></el-icon>
                  {{ isFav ? '取消自选' : '加入自选' }}
                </el-button>
              </div>
            </el-card>

            <!-- 快速摘要 -->
            <el-card shadow="hover" style="margin-top: 16px">
              <template #header>
                <div class="section-header">
                  <el-icon><Tickets /></el-icon>
                  <span>快速摘要</span>
                </div>
              </template>
              <div class="quick-summary">
                <div class="summary-row">
                  <span class="label">状态</span>
                  <el-tag :type="statusTag.type" size="small">{{ statusTag.label }}</el-tag>
                </div>
                <div class="summary-row">
                  <span class="label">估值</span>
                  <el-tag :type="detail.peRating.type" size="small" effect="light">{{ detail.peRating.label }}</el-tag>
                </div>
                <div class="summary-row" v-if="detail.winRate">
                  <span class="label">中签率</span>
                  <span class="value">{{ detail.winRate }}%</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <el-empty v-else-if="!loading" description="未找到该新股信息" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hkipoApi } from '@/api/hkipo'
import { useUserStore } from '@/stores/user'
import { formatNumber } from '@/utils/format'
import { ArrowLeft, InfoFilled, DataAnalysis, Clock, Operation, Star, StarFilled, Tickets } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const detail = ref(null)
const loading = ref(true)

const isFav = computed(() => userStore.isFavorite('hkipo', route.params.code))

const peDiffClass = computed(() => {
  if (!detail.value) return ''
  if (detail.value.peDiff < 0) return 'text-success'
  if (detail.value.peDiff > 5) return 'text-danger'
  return ''
})

const statusTag = computed(() => {
  if (!detail.value) return { type: 'info', label: '--' }
  if (!detail.value.listDate) return { type: 'warning', label: '申购中' }
  return { type: 'success', label: '已上市' }
})

const timeline = computed(() => {
  if (!detail.value) return []
  const items = []
  if (detail.value.applyDate) items.push({ date: detail.value.applyDate, text: '申购日期', type: 'primary' })
  if (detail.value.listDate) items.push({ date: detail.value.listDate, text: '上市日期', type: 'success' })
  return items
})

onMounted(async () => {
  try {
    const data = await hkipoApi.detail(route.params.code)
    if (data) {
      // 用 store 的 normalizeIpoItem 逻辑处理
      const peDiff = data.pe_diff ?? 0
      const getPeRating = (diff) => {
        if (diff < 0) return { label: '低估', type: 'success' }
        if (diff <= 5) return { label: '合理', type: 'warning' }
        return { label: '偏高', type: 'danger' }
      }
      detail.value = {
        code: data.code || '',
        name: data.name || '--',
        ipoPrice: data.ipo_price ?? 0,
        applyDate: data.apply_date || '',
        listDate: data.list_date || '',
        winRate: data.win_rate || '',
        peRatio: data.pe_ratio || '',
        industryPe: data.industry_pe || '',
        peDiff,
        peRating: getPeRating(peDiff),
      }
    }
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
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.text-muted {
  color: var(--text-color-secondary);
}

.text-success {
  color: var(--el-color-success);
  font-weight: 700;
}

.text-danger {
  color: var(--el-color-danger);
  font-weight: 700;
}

.pe-comparison {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
  padding: 20px 0;

  .pe-item {
    text-align: center;

    .pe-label {
      font-size: 13px;
      color: var(--text-color-secondary);
      margin-bottom: 8px;
    }

    .pe-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-color);
    }
  }

  .pe-divider {
    font-size: 14px;
    color: var(--text-color-secondary);
  }
}

.pe-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.6;

  .el-icon {
    margin-top: 2px;
    flex-shrink: 0;
  }
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-summary {
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }

    .label {
      color: var(--text-color-secondary);
      font-size: 14px;
    }

    .value {
      font-weight: 600;
    }
  }
}

@media (max-width: 768px) {
  .pe-comparison {
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px 0;

    .pe-item {
      .pe-value {
        font-size: 18px;
      }
    }

    .pe-divider {
      display: none;
    }
  }
}
</style>
