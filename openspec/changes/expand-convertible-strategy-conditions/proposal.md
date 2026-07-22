# Expand Convertible Strategy Conditions

## Why

The convertible workspace currently gives users short strategy slogans that omit the actual screen thresholds, ranking rules, and the distinction between a market observation and a verified corporate action. This can cause a signal such as a price proximity measure to be read as a confirmed redemption, down-revision, or executable arbitrage event.

## What Changes

- Add an expandable strategy-conditions panel for each convertible workspace tab.
- State each screen's inclusion conditions, calculation basis, default ordering, and decision boundary using the same rules as the service.
- Correct misleading wording that treats the 130 percent price fallback or the 85 percent down-revision benchmark as a confirmed issuer trigger.
- Clarify the evidence required before a placement observation, redemption condition, down-revision event, or conversion arbitrage can be treated as executable.

## Capabilities

### New Capabilities

- `convertible-strategy-condition-disclosure`: A Web disclosure surface that explains the rules and limitations of each convertible strategy signal.

### Modified Capabilities

- `convertible-bonds`: The monitored signal presentation gains explicit, rule-aligned condition and limitation requirements.

## Impact

- Affects `trading-toolkit-web/src/views/Convertible.vue` and the convertible-bonds OpenSpec baseline.
- Does not change the service API, market-data sources, signal calculation, cache behavior, or the out-of-maintenance `trading-toolkit-mp` module.
- Rollback consists of removing the disclosure panel and restoring the existing guide copy; no data migration or API rollback is required.
