## 1. Product and Data Decisions

- [x] 1.1 Define holdings as fund portfolio exposure; user brokerage positions are out of scope.
- [ ] 1.2 Select a verified fund-portfolio disclosure source and freshness limit; the implementation returns unavailable until one exists.
- [x] 1.3 Define 5/20-session observation windows for persistence, liquidity comparison, and volatility components.
- [x] 1.4 Document the 0.15% purchase-fee and 0.05% sell-commission assumptions as non-account-specific.

## 2. Service Detail Contract

- [x] 2.1 Add a persisted, source-tagged LOF observation store that records only valid quotes and does not backfill missing history with estimates.
- [x] 2.2 Add a dated holdings-disclosure store and explicit unavailable-state representation.
- [x] 2.3 Implement `GET /api/v1/lof/:code/detail` with instrument, execution, premium, liquidity, holdings, volatility, and provenance groups.
- [x] 2.4 Keep mock or insufficient `lof_arbitrage` history out of detail decision metrics.
- [x] 2.5 Add service tests for verified data, stale data, insufficient history, and unavailable holdings.

## 3. Web Detail Workspace

- [x] 3.1 Add the `/lof/:code` route and migrate LOF-list row navigation from the modal to the route.
- [x] 3.2 Implement the decision header and premium persistence visualization with observation-window and freshness labels.
- [x] 3.3 Implement the execution-capacity and liquidity sections with current and rolling metrics.
- [x] 3.4 Implement the holdings-exposure and settlement-window risk sections with explicit unavailable states.
- [ ] 3.5 Remove the legacy LOF detail dialog after route parity is verified.

## 4. Verification and Delivery

- [x] 4.1 Add focused API contract and derived-metric tests.
- [x] 4.2 Run the backend test suite and Web production build.
- [x] 4.3 Verify desktop and mobile detail layouts with browser screenshots, including missing-data states.
- [ ] 4.4 Validate the OpenSpec change and archive it after the implementation is accepted.
