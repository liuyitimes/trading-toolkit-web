# Tasks

- [x] Define the optional `execution.settlement_timing` list/detail contract for the companion `trading-toolkit-service` change.
- [x] Normalize absent, partial, verified, and stale settlement timings without deriving a value.
- [x] Add the compact `申/赎时效` field to both LOF desktop tables and all mobile LOF cards.
- [x] Add timing evidence, effective date, verification time, and explicit unavailable state to the deep-link LOF detail view.
- [x] Remove every exchange-derived LOF redemption-rule display.
- [x] Apply strategy-label semantic colors for incomplete or risk states where labels are rendered.
- [x] Add contract and browser tests for complete, partial, stale, and legacy responses across desktop and mobile views.
- [x] Run targeted formatting, production build, browser verification, and `openspec validate lof-settlement-timing --json`.
