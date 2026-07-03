<template>
  <div class="page-container">
    <div class="page-header">
      <h2>自选管理</h2>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="可转债" name="convertible">
        <el-table :data="userStore.favoriteBonds" stripe>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="code" label="代码" width="120" />
          <el-table-column prop="addedAt" label="添加时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.addedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="danger" text size="small" @click="userStore.removeFavorite('convertible', row.code)">
                <el-icon><Delete /></el-icon> 移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="userStore.favoriteBonds.length === 0" description="暂无自选可转债" />
      </el-tab-pane>

      <el-tab-pane label="LOF 基金" name="lof">
        <el-table :data="userStore.favoriteLof" stripe>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="code" label="代码" width="120" />
          <el-table-column prop="addedAt" label="添加时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.addedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="danger" text size="small" @click="userStore.removeFavorite('lof', row.code)">
                <el-icon><Delete /></el-icon> 移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="userStore.favoriteLof.length === 0" description="暂无自选 LOF 基金" />
      </el-tab-pane>

      <el-tab-pane label="港股打新" name="hkipo">
        <el-table :data="userStore.favoriteIpos" stripe>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="code" label="代码" width="120" />
          <el-table-column prop="addedAt" label="添加时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.addedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="danger" text size="small" @click="userStore.removeFavorite('hkipo', row.code)">
                <el-icon><Delete /></el-icon> 移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="userStore.favoriteIpos.length === 0" description="暂无自选港股" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'

const userStore = useUserStore()
const activeTab = ref('convertible')
</script>
