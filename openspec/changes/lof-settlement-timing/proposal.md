# LOF Settlement Timing Disclosure

## Why

The LOF list and detail workflows discuss subscription, redemption, and settlement-window risk, but they do not present the fund-specific time required for subscription confirmation or redemption payment. A legacy LOF dialog additionally derives a redemption rule from the exchange, which can contradict a fund's current manager-published rule.

## Intended outcome

For every LOF, the Web application presents two independently verified settlement timings:

1. `申购确认 T+n`
2. `赎回到账 T+n`

The list exposes the pair for scanning. The deep-link detail view exposes the pair together with evidence and verification state. Missing or incomplete evidence remains visibly unavailable and cannot support an executable-arbitrage claim.

## Scope

- Render per-fund subscription-confirmation and redemption-payment timings in both LOF desktop tables and mobile cards.
- Render each timing, its source, effective date, verification time, and status in the LOF detail execution-evidence section.
- Preserve the source's stated trading-day or business-day wording in the displayed `T+n` value.
- Remove the exchange-derived redemption-rule presentation from the legacy LOF dialog.
- Accept the companion Service response as an optional extension so existing responses degrade to `暂缺`.

## Repository scope

This Web change owns API consumption, list/card/detail presentation, unavailable states, and removal of the exchange-derived display. The matching `lof-settlement-timing` change in `trading-toolkit-service` owns current manager or issuer evidence, extraction, freshness assessment, and the list/detail response fields.

## Out of scope

- Inferring `T+n` from the listing exchange, expected sell date, past transactions, or another fund's rule.
- Calculating a user-specific trade date, redemption amount, tax, or return.
- Changing subscription limits, custody-transfer rules, or the arbitrage scoring formula.

## Rollback

Remove the optional timing presentation and restore the prior detail layout. The application must not restore any exchange-derived redemption rule.
