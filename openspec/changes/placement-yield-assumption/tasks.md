## 1. Specification and Tracking

- [x] 1.1 Record the placement-yield-assumption requirements, implementation design, and local implementation issue.
- [x] 1.2 Align the existing placement-rating documentation with the 30-to-100 percent assumption and 80/60 rating thresholds.

## 2. Placement Derivation

- [x] 2.1 Add validated, locally persisted placement premium state and controls to the convertible store.
- [x] 2.2 Preserve normalized API source fields and derive expected profit, safety pad, score, rating, and composite rank from the active assumption.

## 3. Placement UI

- [x] 3.1 Add the placement-toolbar selector, active-assumption disclosure, and accessible reset control.
- [x] 3.2 Synchronize list, mobile cards, safety-pad tooltip, and open detail dialog; remove the obsolete detail-only premium state.

## 4. Verification

- [x] 4.1 Add deterministic Playwright coverage with mocked placement data for calculation, validation, persistence, reset, ranking, and scope isolation.
- [x] 4.2 Run OpenSpec validation, formatting checks, production build, and desktop/mobile browser verification.
