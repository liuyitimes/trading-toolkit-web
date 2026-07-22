# Global Placement Yield Assumption

## Why

Placement safety pads, scores, and expected profits are currently tied to an opaque fixed 20 percent listing-premium assumption or optional API values. Users cannot compare candidates under their own consistent premise, and the displayed score can contradict the displayed safety pad.

## What Changes

- Add a Web-only, locally persisted expected-listing-premium assumption for convertible placement.
- Replace API-provided expected-profit, safety-pad, score, rating, and composite-rank display values with client-derived values based on that assumption.
- Add a placement-toolbar selector, reset control, and assumption disclosure in the list, detail dialog, and calculation tooltip.
- Remove the obsolete detail-only premium-rate state.

## Capabilities

### New Capabilities

- `placement-yield-assumption`: A user-controlled, locally persisted placement yield assumption and its UI controls.

### Modified Capabilities

- `convertible-bonds`: Placement expected-profit, safety-pad, score, rating, and ranking requirements become assumption-derived Web values.

## Impact

- Affects the Vue Web placement store, view, browser verification, and placement documentation.
- Does not change APIs, API envelopes, data sources, cache policy, backend behavior, or the out-of-maintenance mini-program.
- Rollback removes the Web parameter and restores the prior fixed comparison assumption; no user data migration or API rollback is required.
