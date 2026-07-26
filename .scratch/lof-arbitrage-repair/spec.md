# LOF 基金套利数据与研究工作台修复规格

Status: ready-for-agent

## Problem Statement

LOF 基金套利页面当前无法提供用户界面承诺的市场概览和研究数据。生产市场概览响应缺少溢价热点方向、昨日净申购资金、昨日净申购账户数下限和昨日净申购投资者限额下限；列表将缺失的净值、溢价和连续溢价呈现为 `0`；详情服务不存在，导致持仓、日度溢价历史、流动性历史、风险和执行证据均不可用。

用户需要区分已观测的 LOF Published-NAV Premium、盘中 LOF Holdings-Implied Premium 和 LOF Portfolio Holdings，研究一个标的是否值得进一步核验，而不是看到未验证的高溢价或零值后被误导为可执行套利。

## Solution

建立以基金管理人公告和交易所披露为核验依据的 LOF 数据链路。服务端提供来源明确、具备可用性状态的市场概览、日度收盘价与净值观测、持仓披露、盘中持仓推算估计和执行路径证据；Web 端按证据强度显示列表摘要和深链接详情研究视图。

市场概览保留并填充现有四项：溢价热点方向、昨日净申购资金（按净值估）、昨日净申购账户数下限、昨日净申购投资者限额下限。缺少经核验来源时，界面显示 `暂缺` 和原因，而不编造或回退为零值。

## User Stories

1. As a LOF 研究用户, I want to see the premium hot direction, so that I can identify the documented market theme with the strongest positive premium.
2. As a LOF 研究用户, I want to see the sample count, classification method, and unclassified coverage behind a hot direction, so that I can judge whether it is representative.
3. As a LOF 研究用户, I want to see yesterday's net subscription capital estimate with its share date and NAV date, so that I can distinguish completed-day activity from intraday market movement.
4. As a LOF 研究用户, I want to see the lower bound derived from verified per-account limits, so that I do not mistake it for a verified participant or person count.
5. As a LOF 研究用户, I want per-investor-limit estimates to remain separate from per-account estimates, so that I can understand their different meanings.
6. As a LOF 研究用户, I want unavailable overview data to explain why it is unavailable, so that I do not confuse an absent verified source with zero activity.
7. As a LOF 研究用户, I want each completed trading day's published-NAV premium calculated from that day's close and matching NAV, so that continuous premium reflects observed market history.
8. As a LOF 研究用户, I want continuous premium to count only consecutive completed trading sessions with positive valid premiums, so that missing NAV data cannot create a false sequence.
9. As a LOF 研究用户, I want a clear distinction between zero consecutive premium sessions and insufficient history, so that I can assess data quality.
10. As a LOF 研究用户, I want 5- and 20-session premium, liquidity, and volatility views, so that I can assess persistence and settlement-window risk.
11. As a LOF 研究用户, I want a current intraday reference to be labelled separately from published-NAV history, so that a prior-day NAV never advances a completed-session count.
12. As a LOF 研究用户, I want a LOF Holdings-Implied Premium only when a fresh, adequately covered portfolio can be valued, so that an estimate is not mistaken for a fund-manager-published NAV.
13. As a LOF 研究用户, I want the holdings-implied estimate to disclose portfolio coverage, disclosure date, calculation time, and method version, so that I can judge its reliability.
14. As a LOF 研究用户, I want a compact dated holdings summary in the list, so that I can compare exposure without opening every detail view.
15. As a LOF 研究用户, I want complete disclosed holdings, concentration, source, and disclosure date in the detail view, so that I can evaluate portfolio exposure during the settlement period.
16. As a LOF 研究用户, I want to distinguish fund portfolio holdings from my own position and from fund share changes, so that the page uses the correct meaning of 持仓.
17. As a LOF 研究用户, I want a positive premium to be labelled as an observation candidate until execution evidence is complete, so that I do not treat screening data as a trade instruction.
18. As a LOF 研究用户, I want an instrument to become a 可研究候选 only after subscription, limit, custody-transfer, sale-path, liquidity, and freshness evidence are verified, so that the status has a defensible meaning.
19. As a LOF 研究用户, I want unverified, stale, low-coverage, or unavailable evidence to be shown explicitly, so that I can decide what needs further research.
20. As a mobile LOF 研究用户, I want the same evidence and unavailable states in the responsive detail view, so that I can research safely away from a desktop.
21. As a maintainer, I want the Web client and Service contract tested together using deterministic fixture responses, so that endpoint omissions and invalid fallback rendering are caught before release.

## Implementation Decisions

- The Service is the owner of collection, source selection, persistence, derivation, provenance, availability states, and the LOF HTTP contract. The Web application only consumes and presents that contract.
- Fund-manager announcements and exchange disclosures are authoritative for share changes, subscription limits, and LOF Portfolio Holdings. Market-data providers may supply prices and liquidity but cannot by themselves establish those facts.
- The market-overview contract supplies a documented hot direction plus a `daily_subscription` group containing status, reason, share date, NAV date, source, retrieval time, unit, compatibility information, capital estimate, per-account lower bound, and per-investor lower bound.
- Net subscription capital includes only compatible positive net-share-change records for the latest completed trading day, multiplied by matching NAV. It is an estimate, not gross applications, allocation count, or unique people.
- Daily LOF observations retain instrument, trade date, close, NAV, NAV date, source, observed time, retrieval time, validity, and unavailable reason. A valid Published-NAV Premium uses matching trade and NAV dates; missing or stale inputs are unavailable rather than zero.
- Continuous premium, 5-session, and 20-session outputs are derived on the Service from valid persisted observations. An intraday price paired with the latest published NAV is a separate current reference and cannot affect the completed-session sequence.
- LOF Portfolio Holdings are returned with security or asset identity, weight, portfolio concentration, disclosure date, source, and availability. List presentation is a dated summary; the detail view provides the disclosed portfolio and concentration.
- A LOF Holdings-Implied Premium is permitted only when at least 90% of fund assets are real-time priceable and the disclosure is no more than one trading day old. The response identifies priceable and unpriced coverage, cash and derivative treatment, valuation-method version, disclosure date, source, calculation time, and freshness. Otherwise the estimate is unavailable.
- The list uses `观察候选` for screen results. The detail view uses `可研究候选` only when the Service returns current traceable evidence for subscription availability, limit and limit subject, custody transfer, expected sale path/date, liquidity, and freshness.
- Positive opportunity labels use red, neutral or unverified labels use yellow, and risks, negative states, or unavailable execution conditions use green.
- The deep-linked research detail replaces the legacy fixed-fee dialog and its mock-compatible capital-flow prediction after parity verification. It presents premium, persistence, capacity, holdings exposure, settlement risk, provenance, and unavailable states in that order.
- The LOF detail endpoint is declared in the shared Service HTTP contract before the Web route depends on it.

## Testing Decisions

- The primary seam is the Service HTTP contract exercised by deterministic browser fixtures at the LOF list and deep-linked detail routes. This tests the externally observable Web behavior while catching contract mismatches at the highest shared boundary.
- Existing API-contract checks are extended to require the LOF detail endpoint. Existing browser checks are extended with deterministic LOF list, summary, and detail fixtures rather than live provider calls.
- Browser assertions cover all four populated overview fields and their provenance; unavailable overview data; valid and missing daily close/NAV pairs; insufficient 5/20-session history; fresh and stale holdings; coverage above and below 90%; and verified versus unverified execution evidence.
- Tests assert that unavailable data never renders as zero, mock history, a fabricated trend, or an executable-arbitrage claim. They cover both desktop and mobile layouts.
- Service tests cover date alignment, net-share filtering, cap-subject separation, source metadata preservation, observation derivation, and holdings-estimate eligibility. Web tests cover labels, ordering, source dates, responsive rendering, and unavailable messages.

## Out of Scope

- Broker account synchronization, order placement, personal holdings, or assertions about a user's realised return.
- Treating the lower-bound proxy as a unique account, investor, or natural-person count.
- Presenting quarterly or otherwise stale portfolio disclosure as a real-time estimate.
- Mock, turnover-derived, or zero-filled substitutes for verified source data.
- Changes to the mini-program.

## Further Notes

The current LOF detail route exists in the Web application but the production Service endpoint returns `404`; release requires the companion Service work. The documented Eastmoney share-change report was previously unavailable, so source selection must be validated before implementation begins. Existing OpenSpec LOF changes describe parts of this behavior and should be reconciled into corresponding Web and Service change artifacts before code changes are made.
