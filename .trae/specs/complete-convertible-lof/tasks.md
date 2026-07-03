# Tasks

- [x] Task 0: 提交已有产出到 git 仓库
  - [x] 0.1 检查 git status，确认未提交文件清单（Convertible.vue/Lof.vue 重写、stores/convertible.js、stores/lof.js、api/lof.js、api/convertible.js、api/index.js 等）
  - [x] 0.2 git add 相关文件并 commit（信息描述本轮已完成的重写工作）

- [x] Task 1: LOF 后端字段补全（amount/volume 映射）
  - [x] 1.1 修改 `cloudrun/services/normalizer.py` 的 `normalize_lof`，新增 `'amount'`/`'volume'` 字段（除以 10000 转万元/万手单位）
  - [x] 1.2 修改 `cloudrun/services/lof_fund.py` 的 `get_lof_market_summary`，新增 `arbitrage_count` 字段（阈值 1000000 元 = 100 万元）
  - [x] 1.3 重启后端 `py app.py`，调用 `/api/v1/lof/list` 验证返回项含 `amount`/`volume` 字段（示例 81759.21 万元）

- [x] Task 2: LOF 套利机会 Tab 接入
  - [x] 2.1 修改 `src/views/Lof.vue`，在 tabs 数组中新增 `{ key: 'arbitrage', label: '套利机会' }`
  - [x] 2.2 新增 computed `arbitrageList`：从 `store.fundList` 筛选 `canArbitrage === true`，按预期收益排序
  - [x] 2.3 新增"套利机会"Tab 内容区：el-table 展示基金名/代码/溢价率/净溢价/成交额/预期收益/风险提示列，移动端卡片流
  - [x] 2.4 tabStats 计算 arbitrage 数量，徽标高亮

- [x] Task 3: LOF 详情弹窗完善
  - [x] 3.1 在 `src/views/Lof.vue` 详情弹窗中新增"操作建议"卡片区域
  - [x] 3.2 展示 `item.advice` 完整文案（store 中 getAdvice 已生成）
  - [x] 3.3 新增"预计收益计算"明细：一拖一/一拖六账户下的预期收益（基于 premium、申购费 0.15%、限购金额）
  - [x] 3.4 新增"限额说明"：根据 limitStatus 展示限100/不限/暂停的对应说明

- [x] Task 4: 可转债后端配售评级体系
  - [x] 4.1 在 `cloudrun/services/convertible_bond.py` 新增 `_calc_placement_score(issue_size, float_shares, safety_pad)` 函数：size_score=max(0,1-issue_size/10)*30 + float_score=(1-float_shares/issue_size)*40 + safety_score=min(safety_pad/10,1)*30，返回 round 总分
  - [x] 4.2 新增 `_get_rating_by_score(score)` 函数：>=70→recommend，>=40→watch，<40→caution
  - [x] 4.3 修改 `_normalize_jisilu_pre_list`：在 strategy_score 计算前先算 `float_shares`，然后 `strategy_score = _calc_placement_score(...)`，`strategy_rating = _get_rating_by_score(...)`
  - [x] 4.4 在返回 dict 中新增 `'float_shares'` 和 `'strategy_rating'` 字段
  - [x] 4.5 保留 `_calc_strategy_score` 函数定义不删除
  - [x] 4.6 重启后端，调用 `/api/v1/convertible/pending` 验证返回项含 `float_shares`/`strategy_rating`（109 项，caution 102/watch 7）

- [x] Task 5: 可转债前端 store 适配
  - [x] 5.1 修改 `src/stores/convertible.js` 的 `normalizePendingItem`，新增字段：`floatShares`/`_floatSharesRaw`/`strategyScore`/`strategyRating`/`strategyRatingClass`
  - [x] 5.2 `_compositeRankRaw` 改为 `item.strategy_score ?? 0`
  - [x] 5.3 验证 store 加载后 pendingList 各项含新字段（build 通过）

- [x] Task 6: 可转债视图层完善
  - [x] 6.1 配售表格新增"评级"列（el-tag + rating-tag class）
  - [x] 6.2 配售表格新增"流通盘"列
  - [x] 6.3 百元含权/安全垫/流通盘表头 Tooltip 公式说明
  - [x] 6.4 待发弹窗 el-steps 时间轴显示实际日期 + 距今天数
  - [x] 6.5 信号 Tab 默认排序：双低升序、强赎降序、折价降序、下修升序

- [x] Task 7: BondDetail.vue 重写
  - [x] 7.1 基础信息表（12 项字段）
  - [x] 7.2 强制赎回进度卡片（距 130% 差幅 + el-progress，>=0 红色）
  - [x] 7.3 下修进度卡片（距 85% 差幅 + el-progress，<0 黄色）
  - [x] 7.4 折价空间卡片
  - [x] 7.5 条款信息面板（强赎/回售/下修，缺失显示"暂无"）
  - [x] 7.6 自选按钮（isFavorite + toggleFavorite，顶部+操作卡片双处）

- [x] Task 8: 构建与验证
  - [x] 8.1 `npm run build` 通过，无编译错误（1.14s）
  - [x] 8.2 后端 API 验证：LOF amount=84190.24/arbitrage_count=24、可转债 pending 109 项 float_shares=4.55/strategy_rating=caution
  - [x] 8.3 前端代码逻辑验证：store 字段/视图层改动/BondDetail 重写全部到位
  - [x] 8.4 build 产物：BondDetail/Convertible/Lof 三个 chunk 正常生成
  - [x] 8.5 git commit + push 成功（commit b678e33）

# Task Dependencies
- Task 0 是前置，所有后续任务依赖其完成（保证 git 历史清晰）
- Task 1（后端 LOF 字段）→ Task 2/3（前端 LOF 视图）依赖字段补全
- Task 4（后端配售评级）→ Task 5（前端 store）→ Task 6（前端视图）依赖链
- Task 7（BondDetail）独立，可与 Task 1-6 并行
- Task 8 依赖所有前序任务完成
