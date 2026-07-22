# Trading Toolkit Web OpenSpec

`openspec/specs/` is the versioned source of truth for behavior owned by the Web application. It travels with the `trading-toolkit-web` Git repository so a clone on any device includes the current baseline and active changes.

## Scope

- Vue routes, views, stores, client-side calculations, local browser preferences, and API consumption.
- User-facing decision-support presentation and responsive behavior.
- Web-side requirements for a shared API contract.

The independently versioned `trading-toolkit-service` repository owns Flask routes, source collection, cache behavior, persistence, and server-side calculations. A feature that crosses these boundaries SHALL use the same change name in both repositories, with each change artifact describing only its repository's work and explicitly linking the companion change.

## Workflow

1. Read the relevant baseline specification under `openspec/specs/`.
2. Create or update `openspec/changes/<change-name>/` before implementation.
3. Complete proposal, delta specifications, design, and tasks.
4. Verify the implementation and run `openspec validate <change-name> --json`.
5. Archive an accepted change in this repository to merge its deltas into this Web baseline.
