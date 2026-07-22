# 配售智能评级体系设计

> 2026-07-22 修订：Web 配债页使用全局预期上市溢价率假设重算预估收益、安全垫、评分和评级。本文中服务端 `strategy_score`、`strategy_rating` 与安全垫字段保留为源数据背景，不再控制 Web 端展示或排序。

## 背景

配售模块（可转债待发/抢权配售）当前有排序功能，但缺少基于实战决策的智能评级。用户实盘决策流程为：

1. 看发行规模 → 筛小盘
2. 看首日可交易量规模（发行规模 - 大股东认购）→ 判断实际市场供给
3. 看安全垫 → 判断正股下跌保护空间

本次设计将此决策流程量化为三因子加权评分体系。

## 评分算法

### 三因子

| 因子             | 权重 | 计算公式                                 | 数据来源                 |
| ---------------- | ---- | ---------------------------------------- | ------------------------ |
| 发行规模得分     | 30%  | `score = max(0, 1 - issueSize / 10)`     | `issue_size`（东方财富） |
| 首日可交易量得分 | 40%  | `score = 1 - tradableAmount / issueSize` | `online_amount` 或计算   |
| 安全垫得分       | 30%  | `score = min(safetyPad / 10, 1)`         | 现有 `safety_pad`        |

**总分** = 发行规模×0.3 + 首日可交易量×0.4 + 安全垫×0.3，范围 0-100。

### 评级映射

| 分数段 | 评级   | CSS class   | 标签颜色 |
| ------ | ------ | ----------- | -------- |
| >= 80  | 推荐   | `recommend` | 红色     |
| >= 60  | 可关注 | `watch`     | 黄色     |
| < 60   | 谨慎   | `caution`   | 绿色     |

### 首日可交易量计算

```
if online_amount > 0:
    tradable_amount = online_amount
else:
    tradable_amount = amount × (1 - ration_rt / 100)
```

安全垫、预估收益、评分与评级使用 Web 端全局预期上市溢价率假设：默认 30%，仅允许 30% 至 100%，按 10% 递进。该假设用于横向比较，不代表已验证回报。

## 后端改动

**文件**: `trading-toolkit-service/cloudrun/services/convertible_bond.py`

### `_fetch_em_pending_bonds` 新增字段

在返回的 dict 中新增：

```python
# 首日可交易量
tradable_amount = online_amount if online_amount > 0 else issue_size * (1 - ration_rt / 100)

# 评级评分（新三因子版本）
strategy_score = _calc_placement_score(issue_size, tradable_amount, safety_pad)
strategy_rating = _get_rating_by_score(strategy_score)
```

### 新增函数

```python
def _calc_placement_score(issue_size, tradable_amount, safety_pad):
    """配售三因子评分 0-100"""
    size_score = max(0, 1 - issue_size / 10)
    float_score = 1 - (tradable_amount / issue_size) if issue_size > 0 else 0
    safety_score = min(safety_pad / 10, 1)
    return round(size_score * 30 + float_score * 40 + safety_score * 30)

def _get_rating_by_score(score):
    if score >= 80: return 'recommend'
    if score >= 60: return 'watch'
    return 'caution'
```

### 现有 `_calc_strategy_score` 保留

现有函数被信号 tab 使用，不做修改。配售用新函数 `_calc_placement_score`。

## 前端 Store 改动

**文件**: `src/stores/convertible.js` 的 `normalizePendingItem`

新增字段：

```js
tradableAmount: tradableAmount ? tradableAmount.toFixed(2) + '亿' : '--',
_tradableAmountRaw: tradableAmount,
strategyScore: item.strategy_score ?? 0,
strategyRating: item.strategy_rating === 'recommend' ? '推荐'
             : item.strategy_rating === 'watch' ? '可关注' : '谨慎',
strategyRatingClass: item.strategy_rating || 'caution',
```

综合排序 `_compositeRankRaw` 改为直接使用后端的 `strategy_score`：

```js
_compositeRankRaw: item.strategy_score ?? 0,
```

## 前端视图改动

**文件**: `src/views/Convertible.vue`

### 1. 评级标签

配售列表每项显示评级徽章（绿/黄/红色）。

### 2. 首日可交易量列

配售列表新增"首日可交易量"列，显示 `tradableAmount`。

### 3. Tooltip 公式说明

百元含权、安全垫、首日可交易量三个关键参数支持悬停 tooltip 展示计算公式：

- **百元含权**: `百元含权 = 每股配售金额 × 100 / 正股价格`
- **安全垫**: `安全垫 = 预估获利(1000×预期上市溢价率) / 获配每手成本 × 100%`
- **首日可交易量**: `首日可交易量 = 发行规模 − 原股东配售部分`

移动端 fallback 到长按或点击触发。

### 4. 发行时间轴增强

每个已完成/当前节点下方显示：

- 实际日期（从 `progress_dt`、`regDate` 等字段提取）
- 当前节点显示距今天数（如"上市 -2天"、"登记日 +3天"）

## 不改动部分

- Web 端全局预期上市溢价率假设，以及由其派生的安全垫、评分和评级
- 现有排序按钮（含权/安全垫/规模/涨幅）全部保留
- 子标签（全部/申购中/待上市/审批中）逻辑不变
- 信号 tab 的评分体系不变
