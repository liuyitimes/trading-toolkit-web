# Placement Data Persistence Design

## Goal

Serve pending convertible-bond placement candidates immediately from local persistence, while refreshing external providers asynchronously and preserving source-aware history.

## Write Model

| Entity                      | Identity                                   | Purpose                                                                                           |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `placement_candidate`       | stock code + bond code                     | Stable lifecycle identity for a placement opportunity.                                            |
| `placement_snapshot`        | candidate id                               | Current user-facing state, freshness metadata, and the latest accepted field groups.              |
| `placement_observation`     | candidate id + observed time + field group | Append-only before/after values, source evidence, calculation version, and reconciliation result. |
| `placement_source_evidence` | source kind + source identifier            | Announcement URL/ID, publication time, verification time, and content hash.                       |
| `placement_refresh_job`     | refresh scope + requested time             | Deduplicated asynchronous refresh lifecycle, attempts, failures, and next retry time.             |

`placement_snapshot` owns display state. `placement_observation` is the audit trail and must not be overwritten. Derived metrics carry a calculation version and input snapshot reference; they do not claim an external source.

## Field Groups

| Group           | Fields                                                                             | Provenance                                                |
| --------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| issuer terms    | registration date, subscription date, allocation ratio, issue size, payment timing | announcement ID, URL, publication time, verification time |
| market fields   | stock price, change, PB, MA20                                                      | provider and observation time                             |
| lifecycle       | status, listing date, participation relevance                                      | source and reconciliation time                            |
| derived metrics | expected profit, safety pad, score, rating                                         | calculation version and input snapshot reference          |

Source priority is official exchange/CNINFO announcement, issuer page, Eastmoney issuance list, then other market or inferred values. Equal-priority conflicts retain both observations and set `review_required`.

## Read And Refresh

`GET /api/v1/convertible/pending` reads `placement_snapshot` only. Its response includes `data_as_of`, `freshness_state`, `stale_reason`, `verification_state`, and field provenance references. It never performs provider I/O.

If a snapshot is stale, the API returns it and enqueues at most one matching `placement_refresh_job`. A forced refresh creates or observes the job and returns job status rather than waiting for the provider.

Refresh at service start; every 15 minutes on trading days from 08:30 to 18:00; every two hours otherwise; and every five minutes when the registration date is today or tomorrow. Deduplicate jobs and retry failures with exponential backoff.

## Retention

Keep current snapshots through 30 days after registration. Retain observations and source metadata for three years. A daily cleanup soft-deletes obsolete snapshots while preserving audit history.

## UI Contract

Fresh data shows its update time. Stale data shows the last successful time and reason. Verified issuer terms show an announcement-verification state; conflicts show a review-required state. Candidates registering today or tomorrow stay visible even if market fields are stale.

## Migration Sequence

1. Add tables and indexes without changing the existing endpoint.
2. Backfill current pending rows as initial snapshots with `source=legacy-import`.
3. Run the refresh worker in shadow mode and compare snapshots with the current live result.
4. Switch the read endpoint to snapshots and expose freshness metadata.
5. Enable UI freshness indicators, source links, and review state.
6. Remove synchronous provider work from the read endpoint after parity monitoring.
