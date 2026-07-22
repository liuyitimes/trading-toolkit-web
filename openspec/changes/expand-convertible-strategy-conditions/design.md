## Context

`Convertible.vue` currently has one concise guide sentence per strategy and several field-level formula tooltips. The service applies concrete list filters in `get_convertible_bond_signals()`, while the view also derives presentation-only thresholds such as double-low below 130, a 130 percent fallback redemption line, and an 85 percent down-revision benchmark. The short guide text blends these concepts and can overstate what a market-data screen verifies.

## Goals / Non-Goals

**Goals:**

- Make each strategy's inclusion conditions, formula or ranking, and action boundary visible in the Web workspace.
- Align all stated conditions with current service code and current Web sorting behavior.
- Correct language that can confuse price proximity with issuer action.

**Non-Goals:**

- Change service signal filters, data sources, returned API fields, or cache policy.
- Parse each bond's prospectus or announcements to verify issuer-specific redemption or down-revision clauses.
- Give investment advice, place orders, or maintain the mini-program.

## Decisions

### Place the disclosure directly below the existing guide alert

Use a compact, collapsed Element Plus disclosure controlled by the active tab. This makes the conditions discoverable at the decision point without adding another icon to every table header or obscuring the data table.

Alternative considered: expand the single-line guide text. Rejected because five strategies require several independent conditions and caveats, which would produce an unreadable alert.

### Keep rule text as structured client-side configuration

Store title, screen conditions, interpretation, ordering, and boundary text beside the existing `guideMap`. The service returns no signal-definition metadata, and the condition text is a stable rendering of current source-code rules. This keeps the panel tied to the view's existing tab configuration without changing the API contract.

Alternative considered: have the service return the description. Rejected for this change because the backend rules remain unchanged and a new API field would add a contract and cache surface solely for static disclosure text.

### Separate formal issuer clauses from strategy reference lines

The panel must call the 130 percent figure a fallback when an upstream trigger price is unavailable; it must explain that issuer clauses can require a consecutive-trading-day condition. It must call the 85 percent line a strategy benchmark, since the service explicitly does not use the conditional put-back trigger as a down-revision benchmark. These descriptions prohibit claims that the screen confirms either event.

## Risks / Trade-offs

- [Frontend rule text drifts from future service filters] -> Keep the source conditions in one local configuration and update this OpenSpec change/baseline whenever filters change.
- [Users read a disclosure as advice] -> Use neutral screening language and explicit evidence requirements; do not add trading calls to action.
- [Issuer terms differ from generic reference lines] -> State the limitation and require issuer-specific announcement/prospectus verification.

## Migration Plan

Deploy the Web change with no API or data migration. Verify each tab's disclosure against the service filters and responsive layout. Roll back by removing the disclosure configuration and template section; existing signal data remains unaffected.

## Open Questions

None. Issuer-specific clause extraction is explicitly out of scope and remains a future data-enrichment capability.
