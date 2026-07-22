# Trading Toolkit

This context models market data and decision support for mainland-market investment strategies. Its terms distinguish source data from the user assumptions used to evaluate a strategy.

## Convertible Placement

**收益假设**:
The expected return for one placement lot (10 convertible bonds), derived as its face value of 1,000 yuan multiplied by the expected listing premium rate. It is an assumption, not a market quote or guaranteed return.
_Avoid_: 预估收益, 实际收益, 收益率

**预期上市溢价率**:
The global user-selected percentage used to derive the收益假设 for all placement candidates. It defaults to 30%, permits only 30% through 100%, and changes in 10-percentage-point increments. It applies only to the convertible-placement strategy.
_Avoid_: 预估收益率, 实际首日涨幅

**全局策略参数**:
A locally persisted user preference that applies one shared decision assumption to every placement candidate. It makes compared, ranked, and scored candidates use the same premise.
_Avoid_: 单标的参数, 行情配置

**接口预估收益**:
A per-candidate value optionally supplied by the placement API. It is retained as source data only; the global收益假设 overrides it for all placement-strategy calculations and displays.
_Avoid_: 收益假设, 用户预期

**配售成本**:
The cash required to buy the underlying shares needed to obtain one placement lot, calculated from the placement rule and current underlying-share price.
_Avoid_: 申购金额, 一手价格

**安全垫**:
The percentage of placement cost that the收益假设 can cover, used to express the assumed tolerance for a decline in the underlying share price.
_Avoid_: 收益率, 风险等级

**配债策略评分**:
A composite placement-candidate score derived from issuance scale, first-day tradable amount, and the safety pad. When the收益假设 changes, only its safety-pad factor changes; the score, rating, and composite ranking are recalculated from the same global premise. A score of 80 or higher is recommended, 60 through 79 is watch, and below 60 is cautious.
_Avoid_: 接口评分, 固定评级
