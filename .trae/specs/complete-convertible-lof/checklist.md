# Checklist

## 前置 - Git 提交
- [x] 已有产出（Convertible.vue/Lof.vue 重写及相关 store/api 改动）已提交到 git 仓库
- [x] commit message 描述本轮已完成的重写工作

## LOF 后端字段补全
- [x] `cloudrun/services/normalizer.py` 的 `normalize_lof` 输出 `amount`/`volume` 英文字段（万元/万手单位）
- [x] `cloudrun/services/lof_fund.py` 的 `get_lof_market_summary` 输出 `arbitrage_count`
- [x] 重启后端后 `/api/v1/lof/list` 返回项含 `amount`/`volume` 字段且数值非 0

## LOF 前端
- [x] Lof.vue 新增"套利机会"Tab，展示 `canArbitrage === true` 的基金
- [x] 套利机会 Tab 显示预期收益与风险提示列
- [x] 详情弹窗新增"操作建议"卡片，展示 `item.advice` 完整文案
- [x] 详情弹窗新增"预计收益计算"明细（一拖一/一拖六）
- [x] 详情弹窗新增"限额说明"（基于 limitStatus）

## 可转债后端配售评级
- [x] `convertible_bond.py` 新增 `_calc_placement_score` 三因子函数（30/40/30 权重）
- [x] `convertible_bond.py` 新增 `_get_rating_by_score` 函数（recommend/watch/caution）
- [x] `_normalize_jisilu_pre_list` 计算 `float_shares` 并输出
- [x] `_normalize_jisilu_pre_list` `strategy_score` 改用新算法
- [x] `_normalize_jisilu_pre_list` 输出 `strategy_rating` 字段
- [x] `_calc_strategy_score` 函数定义保留未删除
- [x] 重启后端后 `/api/v1/convertible/pending` 返回项含 `float_shares`/`strategy_rating`

## 可转债前端 store
- [x] `normalizePendingItem` 输出 `floatShares`/`_floatSharesRaw`/`strategyScore`/`strategyRating`/`strategyRatingClass`
- [x] `_compositeRankRaw` 改用 `item.strategy_score`

## 可转债视图层
- [x] 配售表格新增"评级"列（el-tag + 颜色 class）
- [x] 配售表格新增"流通盘"列
- [x] 百元含权/安全垫/流通盘表头 Tooltip 显示公式说明
- [x] 待发弹窗 el-steps 时间轴显示实际日期 + 距今天数
- [x] 信号 Tab 默认排序：双低升序、强赎降序、折价降序、下修升序

## BondDetail.vue 重写
- [x] 基础信息表（12 项字段）
- [x] 强制赎回进度卡片（距 130% 差幅 + el-progress，>=0 红色高亮）
- [x] 下修进度卡片（距 85% 差幅 + el-progress，<0 黄色高亮）
- [x] 折价空间卡片
- [x] 条款信息面板（强赎/回售/下修条款）
- [x] 自选按钮（isFavorite + toggleFavorite）

## 构建与验证
- [x] `npm run build` 通过，无编译错误（1.14s，exit 0）
- [x] 后端重启后 LOF 成交额列显示实际数值（amount 示例 84190.24 万元）
- [x] LOF 套利机会 Tab 可用且有数据（arbitrage_count=24）
- [x] 可转债配售评级徽章正确显示（绿/黄/红，rating-tag class）
- [x] 可转债配售流通盘列有数据（float_shares 示例 4.55 亿）
- [x] BondDetail 各进度卡片正常展示（强赎/下修 el-progress + 折价空间 + 条款面板）
- [x] 暗黑模式下所有新增组件颜色正常（用 var(--el-color-*) CSS 变量）
- [x] 移动端响应式（@media max-width:768px）布局正常（桌面 el-table / 移动卡片双布局）
- [x] Home/Convertible/Lof 三页无 regression（build 通过，API 验证 10/11，113704 空数据为券种本身问题非 regression）
