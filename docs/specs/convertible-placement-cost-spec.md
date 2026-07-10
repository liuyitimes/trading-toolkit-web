# 可转债配售表「成本」列规格说明

> 创建日期：2026-07-09
> 关联文件：`src/stores/convertible.js`、`src/views/Convertible.vue`、`cloudrun/services/convertible_bond.py`

---

## 1. 需求背景

将配售表格原「每股/配10手」列改造为「成本」列，直观展示获配每手（10张债券）所需成本金额，帮助用户快速判断配售资金门槛。

改造前：列名「每股/配10手」，仅展示每股配售额和配10张需股数。
改造后：列名「成本」，主显示「获配每手 xxx 元」+「需买入 xxx 股」，点击弹出完整公式说明弹窗。

---

## 2. 字段定义

以下字段均在 `src/stores/convertible.js` 的 `normalizePendingItem()` 函数中计算（第 193-396 行）。

| 字段名 | 含义 | 计算公式 | 代码位置 |
|--------|------|----------|----------|
| `perShare` | 每股配售额 | 后端 `per_share_allocation`，fallback：`1000 / sharesFor10` | L208-211 |
| `sharesFor10` | 配10张债券所需股数 | 后端 `shares_for_10_lots`（来自东财 `FIRST_PER_PREPLACING`） | L209 |
| `sharesPerLotRaw` | 获配每手理论股数（不取整） | `sharesFor10`（1手=10张，配10张即1手） | L260 |
| `actualSharesFor1Lot` | 实际需购买股数（A股整数约束） | `Math.ceil(sharesPerLotRaw / 100) * 100` | L263 |
| `costPerLot` | 获配每手成本 | `actualSharesFor1Lot * stockPrice` | L266 |

### 原始值字段（用于弹窗计算展示）

| 字段名 | 含义 | 说明 |
|--------|------|------|
| `_perShareRaw` | 每股配售额（数值） | 未格式化，弹窗中用于公式展示 |
| `_sharesFor10Raw` | 配10张需股数（数值） | 未格式化 |
| `_sharesPerLotRaw` | 每手理论股数（数值） | 未格式化 |
| `_actualSharesFor1Lot` | 实际需购买股数（数值） | 未格式化 |
| `_costPerLotRaw` | 每手成本（数值） | 未格式化 |
| `_stockPriceRaw` | 正股价格（数值） | 未格式化 |

### 格式化输出

```javascript
// 展示字段（带单位）
perShare:        perShare ? perShare.toFixed(4) + '元' : '--'
sharesFor10:     sharesFor10 ? sharesFor10 + '股' : '--'
sharesPerLotRaw: _sharesPerLotRaw > 0 ? _sharesPerLotRaw.toFixed(1) + '股' : '-'
actualSharesFor1Lot: _actualSharesFor1Lot > 0
  ? _actualSharesFor1Lot + '股（' + (_actualSharesFor1Lot / 100) + '手）' : '-'
costPerLot:      _costPerLotRaw > 0 ? Math.round(_costPerLotRaw) + '元' : '-'
```

---

## 3. 公式说明（弹窗中展示的完整公式链）

弹窗位于 `src/views/Convertible.vue` 第 534-606 行（`cost-dialog`）。

弹窗分四个区域：

### 3.1 公式说明区

```
每股配售额 = 发行规模 ÷ 总股本
配10张需股数 = 1000 ÷ 每股配售额
获配每手理论股数 = 配10张需股数（1手=10张，配10张即1手）
实际购买股数 = ⌈理论股数 ÷ 100⌉ × 100
获配每手成本 = 实际购买股数 × 正股价格
```

底部注释：`⚠️ A股最小交易单位为1手（100股），需向上取整到100的整数倍；正股价取实时行情`

### 3.2 当前债券计算过程

逐项展示当前债券的具体数值：
- 每股配售额：`_perShareRaw.toFixed(4)` 元
- 正股价格：`_stockPriceRaw.toFixed(2)` 元
- 配10张需股数：`_sharesFor10Raw` 股
- 获配每手理论股数：`_sharesPerLotRaw.toFixed(1)` 股
- 实际需购买：`_actualSharesFor1Lot` 股（`_actualSharesFor1Lot / 100` 手）
- 成本计算：`_actualSharesFor1Lot` 股 × `_stockPriceRaw.toFixed(2)` 元 = `Math.round(_costPerLotRaw)` 元
- 最终结果：**获配每手成本 ≈ Math.round(_costPerLotRaw) 元**（蓝色高亮）

### 3.3 沪深配售规则

- **沪市**：按手配售，1手 = 10张
- **深市**：按张配售，最小1张

### 3.4 沪市一手党规则

沪市可转债配售使用**精确算法**：不足1手的尾数部分，将所有参与配债账户按尾数从大到小排序，依次进位1手直至分配完毕。

**理论最低值（50%）**：由于精确算法对不足1手的部分四舍五入，理论上只需持有配10张需股数的 **50%** 即可获配1手（0.5手四舍五入为1手）。

**实操建议值（60%）**：因多人同时操作存在竞争，建议持有 **60%** 以提高获配成功率。

计算公式：`一手党最低股数 = ⌈配10张需股数 × 60% ÷ 100⌉ × 100`（60%实操值，向上取整到100股整数倍）

仅当 `exchange === '沪'` 且 `_oneHandMinShares > 0` 时显示：
- 最低成本 = `_oneHandMinShares` × 正股价

---

## 4. A股1手=100股整数约束（业务规则）

### 规则说明

A股最小交易单位为 **1手 = 100股**，买入股数必须是100的整数倍。

### 计算逻辑

```javascript
// 理论每手需股数（可能是小数）
const _sharesPerLotRaw = sharesFor10; // 1手=10张，配10张即1手

// 向上取整到100的整数倍
const _actualSharesFor1Lot = _sharesPerLotRaw > 0
  ? Math.ceil(_sharesPerLotRaw / 100) * 100
  : 0;
```

### 示例

| 配10张需股数 | 理论每手股数 | 向上取整后 | 说明 |
|-------------|-------------|-----------|------|
| 500 | 500 | 500 | 恰好是100的倍数，无需取整 |
| 1200 | 1200 | 1200 | 恰好是100的倍数，无需取整 |
| 3500 | 3500 | 3500 | 恰好是100的倍数，无需取整 |
| 1050 | 1050 | 1100 | ceil(1050/100)*100 = 1100 |

### 影响

由于向上取整，实际每手成本可能高于理论值。例如配10张需500股，理论每手50股，但实际需买100股（1手），成本翻倍。这是A股交易规则决定的硬约束。

---

## 5. 数据来源链路

```
东方财富 RPT_BOND_CB_LIST + 新浪 hq.sinajs.cn + 东财 RPT_VALUEANALYSIS_DET + 东财 K线
  ↓ 原始字段：FIRST_PER_PREPLACING（每股配售额）、ACTUAL_ISSUE_SCALE（发行规模）等
  ↓
后端 convertible_bond.py → _fetch_em_pending_bonds()
  ↓ 输出字段：shares_for_10_lots、per_share_allocation、stock_price
  ↓
前端 API 层 src/api/convertible.js → convertibleApi.pending()
  ↓ GET /api/v1/convertible/pending
  ↓
前端 Store 层 src/stores/convertible.js → normalizePendingItem()
  ↓ 计算：sharesPerLotRaw → actualSharesFor1Lot → costPerLot
  ↓
前端视图层 src/views/Convertible.vue → 成本列渲染 + 弹窗
```

### 关键文件

| 层级 | 文件 | 关键函数/行号 |
|------|------|--------------|
| 数据源 | 东方财富 + 新浪财经 | `FIRST_PER_PREPLACING`, `ACTUAL_ISSUE_SCALE`, `hq.sinajs.cn` |
| 后端 | `cloudrun/services/convertible_bond.py` | `_fetch_em_pending_bonds()` |
| 后端路由 | `cloudrun/app.py` | `convertible_pending()` L315-324 |
| 前端 API | `src/api/convertible.js` | `pending()` L16-18 |
| 前端 Store | `src/stores/convertible.js` | `normalizePendingItem()` L193-396 |
| 前端视图 | `src/views/Convertible.vue` | 成本列 L231-240，弹窗 L534-606 |

---

## 6. 交互设计

### 6.1 成本列展示

- **列宽**：170px
- **主显示**：「获配每手 xxx元」（hover 有下划线提示可点击）
- **副显示**：「需买入 xxx股（x手）」（仅 `_actualSharesFor1Lot > 0` 时显示）
- **次显示**：「每股 x.xxx元」
- **末行**：「一手党最低≈xxx元」（仅沪市且有数据时显示，黄色文字）

### 6.2 点击弹窗

- **触发**：点击成本列单元格（`@click.stop="openCostDialog(row)"`）
- **弹窗尺寸**：520px 宽，移动端全屏
- **弹窗标题**：「获配每手成本说明」
- **弹窗内容**：公式说明区 + 分隔线 + 当前债券计算过程 + 分隔线 + 沪深规则 + 一手党信息

### 6.3 行点击不冲突

成本列使用 `@click.stop` 阻止事件冒泡，避免触发行点击（`@row-click="openPendingDetail"`）打开发行详情弹窗。

---

## 7. 边界条件

| 条件 | 处理方式 | 展示效果 |
|------|----------|----------|
| `sharesFor10 = 0` | `_sharesPerLotRaw = 0`，`_actualSharesFor1Lot = 0`，`_costPerLotRaw = 0` | `costPerLot` 显示 `-`，`actualSharesFor1Lot` 显示 `-` |
| `stockPrice = 0` | `_costFor10LotsRaw = 0`，`_costPerLotRaw = 0` | 同上 |
| `perShare = 0` 且 `sharesFor10 = 0` | `perShare` fallback 为 0 | `perShare` 显示 `--` |
| `perShare = 0` 但 `sharesFor10 > 0` | `perShare = 1000 / sharesFor10`（fallback 反推） | 正常展示 |
| `_oneHandMinShares = 0`（深市或非沪市） | 一手党区域不显示 | 弹窗中一手党 section 隐藏 |

---

## 8. 技术债

成本计算（`sharesPerLotRaw`、`actualSharesFor1Lot`、`costPerLot`）目前在前端完成：
- **Web 端**：`src/stores/convertible.js` → `normalizePendingItem()` L259-266
- **小程序端**：`miniprogram/pages/convertible/index.js` → `formatPendingItem()`（注意：小程序端目前**没有** `costPerLot` 和 `actualSharesFor1Lot` 的计算）

**建议**：后续将成本计算迁移到后端 `convertible_bond.py` 的 `_fetch_em_pending_bonds()` 中，统一计算逻辑，避免多端维护不一致。
