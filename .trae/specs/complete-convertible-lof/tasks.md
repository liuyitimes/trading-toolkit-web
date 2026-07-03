# Tasks

- [ ] Task 0: 提交已有产出到 git 仓库
  - [ ] 0.1 检查 git status，确认未提交文件清单（Convertible.vue/Lof.vue 重写、stores/convertible.js、stores/lof.js、api/lof.js、api/convertible.js、api/index.js 等）
  - [ ] 0.2 git add 相关文件并 commit（信息描述本轮已完成的重写工作）

- [ ] Task 1: LOF 后端字段补全（amount/volume 映射）
  - [ ] 1.1 修改 `cloudrun/services/normalizer.py` 的 `normalize_lof`，新增 `'amount': float(row.get('成交额', 0))` 和 `'volume': float(row.get('成交量', 0))` 两个字段
  - [ ] 1.2 修改 `cloudrun/services/lof_fund.py` 的 `get_lof_market_summary`，新增 `arbitrage_count` 字段（基于 amount>=100 && premium>=3 计数）
  - [ ] 1.3 重启后端 `py app.py`，调用 `/api/v1/lof/list` 验证返回项含 `amount`/`volume` 字段

- [ ] Task 2: LOF 套利机会 Tab 接入
  - [ ] 2.1 修改 `src/views/Lof.vue`，在 tabs 数组中新增 `{ key: 'arbitrage', label: '套利机会' }`
  - [ ] 2.2 新增 computed `arbitrageList`：从 `store.fundList` 筛选 `canArbitrage === true`，按预期收益排序
  - [ ] 2.3 新增"套利机会"Tab 内容区：el-table 展示基金名/代码/溢价率/净溢价/成交额/预期收益/风险提示列，移动端卡片流
  - [ ] 2.4 tabStats 计算 arbitrage 数量，徽标高亮

- [ ] Task 3: LOF 详情弹窗完善
  - [ ] 3.1 在 `src/views/Lof.vue` 详情弹窗中新增"操作建议"卡片区域
  - [ ] 3.2 展示 `item.advice` 完整文案（store 中 getAdvice 已生成）
  - [ ] 3.3 新增"预计收益计算"明细：一拖一/一拖六账户下的预期收益（基于 premium、申购费 0.15%、限购金额）
  - [ ] 3.4 新增"限额说明"：根据 limitStatus 展示限100/不限/暂停的对应说明

- [ ] Task 4: 可转债后端配售评级体系
  - [ ] 4.1 在 `cloudrun/services/convertible_bond.py` 新增 `_calc_placement_score(issue_size, float_shares, safety_pad)` 函数：size_score=max(0,1-issue_size/10)*30 + float_score=(1-float_shares/issue_size)*40 + safety_score=min(safety_pad/10,1)*30，返回 round 总分
  - [ ] 4.2 新增 `_get_rating_by_score(score)` 函数：>=70→recommend，>=40→watch，<40→caution
  - [ ] 4.3 修改 `_normalize_jisilu_pre_list`：在 strategy_score 计算前先算 `float_shares = online_amount if online_amount>0 else issue_size*(1-ration_rt/100)`，然后 `strategy_score = _calc_placement_score(issue_size, float_shares, safety_pad)`，`strategy_rating = _get_rating_by_score(strategy_score)`
  - [ ] 4.4 在返回 dict 中新增 `'float_shares': round(float_shares, 2)` 和 `'strategy_rating': strategy_rating` 字段
  - [ ] 4.5 保留 `_calc_strategy_score` 函数定义不删除（设计稿明确要求）
  - [ ] 4.6 重启后端，调用 `/api/v1/convertible/pending` 验证返回项含 `float_shares`/`strategy_rating` 字段

- [ ] Task 5: 可转债前端 store 适配
  - [ ] 5.1 修改 `src/stores/convertible.js` 的 `normalizePendingItem`，新增字段：`floatShares`（格式化 '亿'）、`_floatSharesRaw`、`strategyScore`（取 item.strategy_score）、`strategyRating`（recommend→推荐/watch→可关注/caution→谨慎）、`strategyRatingClass`（item.strategy_rating || 'caution'）
  - [ ] 5.2 `_compositeRankRaw` 改为 `item.strategy_score ?? 0`（替换原本地计算）
  - [ ] 5.3 验证 store 加载后 pendingList 各项含新字段

- [ ] Task 6: 可转债视图层完善
  - [ ] 6.1 在 `src/views/Convertible.vue` 配售表格（桌面+移动）新增"评级"列：el-tag 显示 strategyRating，class 绑定 strategyRatingClass（绿 recommend/黄 watch/红 caution）
  - [ ] 6.2 配售表格新增"流通盘"列：显示 `row.floatShares`
  - [ ] 6.3 百元含权/安全垫/流通盘三列表头加 `el-tooltip`，公式说明：百元含权=每股配售金额×100/正股价；安全垫=预估获利(1000×20%)/(配10张股数×股价)×100%；流通盘=发行规模×(1-股东配售率%)。移动端改为点击展开
  - [ ] 6.4 待发弹窗 el-steps 时间轴增强：每个节点下方显示实际日期（从 progress_dt/regDate/list_date/apply_date 提取），当前节点显示距今天数（如"上市 -2天"、"登记日 +3天"）
  - [ ] 6.5 信号 Tab 细节优化：双低 Tab 按双低值升序默认排序；强赎 Tab 按 _forcePriceGap 降序（接近强赎排前）；折价 Tab 按折价空间降序；下修 Tab 按 _revisePriceGap 升序（最接近下修排前）。高亮规则微调

- [ ] Task 7: BondDetail.vue 重写
  - [ ] 7.1 修改 `src/views/BondDetail.vue` 基础信息表：代码/正股/价格/转股价值/溢价率/到期收益率/剩余规模/双低值（从 convertibleApi.detail 获取）
  - [ ] 7.2 新增"强制赎回进度"卡片：距 130% 强赎线差幅 = (stockPrice - conversionPrice*1.3)/(conversionPrice*1.3)*100，差幅>=0 红色高亮
  - [ ] 7.3 新增"下修进度"卡片：距 85% 下修线差幅 = (stockPrice - conversionPrice*0.85)/(conversionPrice*0.85)*100，差幅<0 黄色高亮
  - [ ] 7.4 新增"折价空间"卡片：premium_rate<0 时显示 |premium_rate|，否则显示无折价
  - [ ] 7.5 新增"条款信息"面板：强赎条款/回售条款/下修条款（从 detail 返回的对应字段展示，无则显示"暂无"）
  - [ ] 7.6 自选按钮：使用 useUserStore.isFavorite('convertible', code) + toggleFavorite

- [ ] Task 8: 构建与验证
  - [ ] 8.1 `npm run build` 通过，无编译错误
  - [ ] 8.2 重启后端，前端 dev 模式验证：LOF 成交额列有数据、套利机会 Tab 可用、可转债配售评级徽章显示、流通盘列有数据、BondDetail 各进度卡片正常
  - [ ] 8.3 暗黑模式覆盖检查、移动端响应式检查（@media max-width:768px）
  - [ ] 8.4 回归：Home/Convertible/Lof 三页无 regression

# Task Dependencies
- Task 0 是前置，所有后续任务依赖其完成（保证 git 历史清晰）
- Task 1（后端 LOF 字段）→ Task 2/3（前端 LOF 视图）依赖字段补全
- Task 4（后端配售评级）→ Task 5（前端 store）→ Task 6（前端视图）依赖链
- Task 7（BondDetail）独立，可与 Task 1-6 并行
- Task 8 依赖所有前序任务完成
