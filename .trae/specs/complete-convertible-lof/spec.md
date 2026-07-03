# 完善可转债与 LOF 页面功能 Spec

## Why
Convertible.vue 与 Lof.vue 主体重写已完成，但仍有明确缺口：
- LOF 后端 `normalize_lof` 漏映射 `成交额`/`成交量`，导致前端 `canArbitrage`/`lowLiquidity` 始终 false，成交额列全 `--`
- `docs/specs/2026-07-02-placement-rating-design.md` 设计的配售三因子智能评级未实施
- BondDetail.vue 仍是基础框架，缺强赎/下修进度、条款面板
- LOF 套利机会 Tab 未实际使用，详情弹窗建议文案单薄
- 用户要求"开始之前先提交产出到 git 仓库"，保留已有成果

## What Changes

### 前置：提交已有产出
- 将 Convertible.vue/Lof.vue 重写及相关 store/api 改动提交到 git 仓库

### LOF 后端字段补全
- **修改** `cloudrun/services/normalizer.py` 的 `normalize_lof`：新增 `amount`/`volume` 字段映射
- **修改** `cloudrun/services/lof_fund.py` 的 `get_lof_market_summary`：新增 `arbitrage_count` 输出

### LOF 前端
- **修改** `src/views/Lof.vue`：新增"套利机会"Tab（基于 `fundList` 本地筛选 `canArbitrage` 标的，展示预期收益与风险提示）
- **修改** `src/views/Lof.vue` 详情弹窗：完善套利操作建议（预计收益计算、限额说明、一拖六账户提示）

### 可转债后端配售评级
- **修改** `cloudrun/services/convertible_bond.py`：
  - 新增 `_calc_placement_score(issue_size, float_shares, safety_pad)` 三因子函数
  - 新增 `_get_rating_by_score(score)` 返回 recommend/watch/caution
  - 修改 `_normalize_jisilu_pre_list`：计算 `float_shares`，新增 `float_shares`/`strategy_rating` 字段，`strategy_score` 改用新算法
  - 保留 `_calc_strategy_score` 函数定义（其他地方可能调用）

### 可转债前端 store 适配
- **修改** `src/stores/convertible.js` 的 `normalizePendingItem`：
  - 新增 `floatShares`/`_floatSharesRaw`/`strategyScore`/`strategyRating`/`strategyRatingClass` 字段
  - `_compositeRankRaw` 改用 `item.strategy_score`

### 可转债视图层
- **修改** `src/views/Convertible.vue`：
  - 配售列表新增评级徽章（绿/黄/红）
  - 配售列表新增"流通盘"列
  - 百元含权/安全垫/流通盘 Tooltip 公式说明
  - 发行时间轴增强：实际日期 + 距今天数
  - 信号 Tab 细节优化（展示/排序/筛选/高亮微调）

### BondDetail.vue 重写
- **修改** `src/views/BondDetail.vue`：
  - 基础信息表（代码/正股/价格/转股价值/溢价率/到期收益/剩余规模/双低值）
  - 强制赎回进度（距 130% 差幅）
  - 下修进度（距 85% 差幅）
  - 折价空间计算
  - 条款信息面板（强赎条款/回售条款/下修条款）
  - 自选按钮

## Impact
- Affected code:
  - 后端：`cloudrun/services/normalizer.py`、`cloudrun/services/lof_fund.py`、`cloudrun/services/convertible_bond.py`
  - 前端：`src/stores/convertible.js`、`src/stores/lof.js`（如需）、`src/views/Convertible.vue`、`src/views/Lof.vue`、`src/views/BondDetail.vue`
- 设计稿引用：`docs/specs/2026-07-02-placement-rating-design.md`

## ADDED Requirements

### Requirement: 配售三因子智能评级
后端 SHALL 在 `_normalize_jisilu_pre_list` 中输出 `float_shares`（流通盘）、`strategy_score`（三因子评分 0-100）、`strategy_rating`（recommend/watch/caution）。

#### Scenario: 流通盘计算
- **WHEN** `online_amount > 0`
- **THEN** `float_shares = online_amount`
- **WHEN** `online_amount <= 0`
- **THEN** `float_shares = issue_size * (1 - ration_rt / 100)`

#### Scenario: 三因子评分
- **WHEN** 计算 `strategy_score`
- **THEN** `size_score = max(0, 1 - issue_size / 10) * 30`
- **AND** `float_score = (1 - float_shares / issue_size) * 40`（issue_size>0 时，否则 0）
- **AND** `safety_score = min(safety_pad / 10, 1) * 30`
- **AND** 总分 = round(三者之和)

#### Scenario: 评级映射
- **WHEN** score >= 70
- **THEN** rating = 'recommend'（推荐，绿色）
- **WHEN** 40 <= score < 70
- **THEN** rating = 'watch'（可关注，黄色）
- **WHEN** score < 40
- **THEN** rating = 'caution'（谨慎，红色）

### Requirement: LOF 成交额/成交量字段
后端 `normalize_lof` SHALL 输出 `amount`/`volume` 英文字段（从中文 `成交额`/`成交量` 映射）。

#### Scenario: 前端套利判定生效
- **WHEN** LOF 列表加载完成
- **THEN** `canArbitrage = (premium >= 3 && amount >= 100 && !paused)` 能正常判定
- **AND** `lowLiquidity = (amount > 0 && amount < 10)` 能正常判定
- **AND** 成交额列显示实际数值（非 `--`）

### Requirement: LOF 套利机会 Tab
LOF 页面 SHALL 新增"套利机会"Tab，展示可套利标的列表与策略建议。

#### Scenario: 套利机会列表
- **WHEN** 用户切换到"套利机会"Tab
- **THEN** 展示所有 `canArbitrage === true` 的基金
- **AND** 每项显示预期收益（基于溢价率与申购费 0.15% 计算）
- **AND** 每项显示风险提示（流动性、连续溢价天数、限购状态）

## MODIFIED Requirements

### Requirement: BondDetail.vue 详情页
BondDetail.vue SHALL 展示完整可转债详情，包括基础信息、强赎/下修进度、折价空间、条款信息、自选按钮。

#### Scenario: 强制赎回进度
- **WHEN** `conversionPrice > 0 && stockPrice > 0`
- **THEN** 展示距 130% 强赎线的差幅百分比
- **AND** 差幅 >= 0 时红色高亮（接近强赎）

#### Scenario: 下修进度
- **WHEN** `conversionPrice > 0 && stockPrice > 0`
- **THEN** 展示距 85% 下修线的差幅百分比
- **AND** 差幅 < 0 时黄色高亮（触发下修）

## REMOVED Requirements
无
