## MODIFIED Requirements

### Requirement: Opportunity qualification

An LOF item SHALL not be described as executable solely because a premium exists. Executability requires current subscription and redemption terms, verified subscription-confirmation and redemption-payment timing, capacity, and traceable issuer or manager evidence.

#### Scenario: A fund has a positive premium

- GIVEN a fund has a calculated market premium
- WHEN the list ranks or labels the item
- THEN it may be shown as an observation or analysis candidate
- AND it is not asserted to be directly arbitrageable without verified operational conditions.

## ADDED Requirements

### Requirement: LOF settlement timing disclosure

The Web application SHALL display per-fund `申购确认 T+n` and `赎回到账 T+n` values returned by the LOF service. It SHALL preserve the source's stated trading-day or business-day wording and SHALL NOT derive a timing value from the exchange, expected sell date, history, or a client default.

#### Scenario: Both timings are verified

- GIVEN a fund's list or detail response includes verified subscription-confirmation and redemption-payment timing
- WHEN a user views that fund in a desktop table, mobile card, or detail view
- THEN the list and card show a compact `申 {T+n} / 赎 {T+n}` value
- AND the detail view shows the two timings separately
- AND the detail view provides the source title and link, effective date, verification time, and status for each timing.

#### Scenario: One timing is unavailable or stale

- GIVEN only one timing is verified, or either timing is unavailable or stale
- WHEN the fund is rendered
- THEN the verified side remains visible
- AND the unavailable side displays `暂缺`
- AND the stale side remains labeled as stale
- AND the execution path is presented as incomplete rather than executable arbitrage.

#### Scenario: A legacy service response omits settlement timing

- GIVEN the LOF service response does not contain settlement-timing fields
- WHEN the list, card, or detail view renders
- THEN both timing displays show `暂缺`
- AND the application continues to render its other LOF data
- AND it does not display an exchange-derived redemption rule.
