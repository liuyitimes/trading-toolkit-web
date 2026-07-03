<template>
  <div class="page-container">
    <div class="page-header">
      <h2>名言管理</h2>
    </div>

    <el-empty v-if="quotes.length === 0" description="暂无名言" />

    <div class="quote-list">
      <el-card
        v-for="(quote, index) in quotes"
        :key="index"
        shadow="hover"
        class="quote-card"
      >
        <div class="quote-content">
          <p class="quote-text">"{{ quote.text }}"</p>
          <p class="quote-author">—— {{ quote.author }}</p>
        </div>
        <div class="quote-actions">
          <el-button type="primary" size="small" plain @click="openEdit(index)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button type="danger" size="small" plain @click="handleDelete(index)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </el-card>
    </div>

    <div class="bottom-actions">
      <el-button type="primary" @click="openAdd">
        <el-icon><Plus /></el-icon> 添加新名言
      </el-button>
      <el-button type="warning" plain @click="handleReset">
        <el-icon><RefreshLeft /></el-icon> 恢复默认
      </el-button>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑名言' : '添加名言'"
      width="500px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="名言内容">
          <el-input
            v-model="form.text"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入名言内容"
          />
        </el-form-item>
        <el-form-item label="作者">
          <el-input
            v-model="form.author"
            placeholder="请输入作者（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { quoteManager } from '@/utils/quoteManager'
import { Edit, Delete, Plus, RefreshLeft } from '@element-plus/icons-vue'

const quotes = ref(quoteManager.getQuotes())
const dialogVisible = ref(false)
const isEditing = ref(false)
const editIndex = ref(-1)

const form = reactive({
  text: '',
  author: ''
})

function loadQuotes() {
  quotes.value = quoteManager.getQuotes()
}

function openAdd() {
  isEditing.value = false
  editIndex.value = -1
  form.text = ''
  form.author = ''
  dialogVisible.value = true
}

function openEdit(index) {
  const quote = quotes.value[index]
  if (!quote) return
  isEditing.value = true
  editIndex.value = index
  form.text = quote.text
  form.author = quote.author
  dialogVisible.value = true
}

function handleSave() {
  if (!form.text.trim()) {
    ElMessage.warning('请输入名言内容')
    return
  }

  if (isEditing.value && editIndex.value >= 0) {
    quoteManager.updateQuote(editIndex.value, form.text, form.author)
    ElMessage.success('修改成功')
  } else {
    quoteManager.addQuote(form.text, form.author)
    ElMessage.success('添加成功')
  }

  loadQuotes()
  dialogVisible.value = false
}

function handleDelete(index) {
  ElMessageBox.confirm('确定要删除这条名言吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    quoteManager.deleteQuote(index)
    loadQuotes()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleReset() {
  ElMessageBox.confirm('确定要恢复为默认名言列表吗？所有自定义名言将被覆盖。', '恢复默认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    quoteManager.resetToDefault()
    loadQuotes()
    ElMessage.success('已恢复默认')
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quote-card {
  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
  }
}

.quote-content {
  flex: 1;
  min-width: 0;
}

.quote-text {
  font-size: 15px;
  color: var(--text-color);
  margin: 0 0 6px;
  line-height: 1.5;
}

.quote-author {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin: 0;
}

.quote-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}

.bottom-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}
</style>
