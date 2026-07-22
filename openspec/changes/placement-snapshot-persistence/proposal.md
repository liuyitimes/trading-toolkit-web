# Persist Placement Snapshots

## Why

The pending-placement API presently performs external aggregation during a user request. A cold upstream path can exceed the Web timeout, hiding imminent registration-date candidates.

## Scope

This Web companion change consumes the service repository change of the same name. It preserves existing list rendering while surfacing snapshot freshness, verified issuer-term evidence, and review-required conflicts.

## Rollback

The Web accepts both the current list payload and the new `{ items, meta }` payload. Reverting the service therefore leaves the placement view functional; freshness UI is omitted when metadata is unavailable.
