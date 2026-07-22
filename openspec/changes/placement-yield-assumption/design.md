## Context

The placement API can return `expected_profit`, `safety_pad`, and `strategy_score`, while the Web store falls back to a fixed 20 percent listing-premium premise. Those values are normalized once at fetch time, so the page cannot consistently recalculate a user-selected scenario. The Web application already uses Pinia composition stores and browser `localStorage` for client preferences.

## Goals / Non-Goals

**Goals:**

- Let users compare all placement candidates with one persisted listing-premium assumption.
- Derive all affected placement metrics from the same premise without changing source data or APIs.
- Keep the existing normalized-data and direct HTTP-client architecture.

**Non-Goals:**

- Estimate a market premium, verify a return, or change issuer terms, service scoring, data sources, caches, or the mini-program.
- Apply the parameter to listed-bond signals or other product modules.

## Decisions

### Keep normalized source rows separate from assumption-derived rows

`applySignals` will store placement rows whose source values include the API-derived fields. A computed `pendingList` will map those source rows through one derivation function each time the selected premium changes. This preserves source traceability and keeps the existing view/filter/sort consumers reactive.

Alternative considered: mutate normalized rows when the selector changes. Rejected because it discards source fields and makes reloads and detail synchronization error-prone.

### Own the parameter in the convertible store

The parameter belongs to the placement strategy, so the convertible store will expose its value, fixed options, setter, and reset operation. A validated local-storage read provides the default of 30 when no valid value exists. This prevents an application-wide setting from affecting unrelated strategies.

### Recalculate the Web score from source factors

The derivation will use issue size and tradable amount from the API and a safety pad calculated from the selected premium. It will preserve the three-factor weights: issue size 30, tradable amount 40, safety pad 30. Ratings use 80/60 thresholds and existing red/yellow/green semantic classes.

Alternative considered: rescale the API score. Rejected because it cannot reliably isolate the original safety-pad contribution.

### Resolve open detail from the current derived list

The view will retain a stable placement identifier and compute the selected detail from `pendingList`, rather than copying the row detail once. Therefore the open dialog updates with the selector while retaining the same candidate.

## Risks / Trade-offs

- [A user treats the assumption as a forecast] -> Label all affected values with the active assumption and retain the existing observation boundary.
- [Invalid local storage] -> Accept only the eight approved values and revert to 30 otherwise.
- [Future server scoring changes] -> The score derivation and its source factors remain localized in the placement store and are specified in this change.

## Migration Plan

Deploy as a Web-only change. Existing users without a preference receive 30; users with malformed or legacy values also receive 30. Roll back by removing the stored parameter and restoring the fixed comparison calculation. No API, schema, cache, or database migration is required.

## Open Questions

None.
