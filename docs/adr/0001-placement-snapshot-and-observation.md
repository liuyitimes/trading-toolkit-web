# 0001: Persist Placement Snapshots and Observations

## Status

Accepted

## Context

The pending-placement endpoint currently composes external data at request time. A cold response can exceed the Web timeout, leaving users without imminent registration-date candidates despite the upstream source eventually returning them.

## Decision

The service will persist a Placement Snapshot for fast reads and retain Placement Observations for source-aware history. External providers refresh snapshots asynchronously; they are not required for the initial API response.

## Consequences

The API can remain available during provider latency or failure and can identify stale data. Persistence needs source URLs, observed and verified timestamps, field-level provenance, retention rules, and reconciliation logic.

## Staleness Rule

When a refresh fails or exceeds its target, the API returns the latest snapshot with an explicit stale state, data time, and reason. It does not hide a candidate that remains relevant through its registration date.

## Provenance Rule

Provenance is stored by field group. Announcement-backed issuer terms and dates retain announcement identity, URL, publication time, and verification time. Market fields retain provider and observation time. Derived metrics retain calculation version and input snapshot reference only.

## Read and Refresh Rule

The pending-placement read API reads only persisted snapshots. It never waits for provider I/O. An expired read returns its latest snapshot with stale metadata and enqueues at most one Placement Refresh Job. A forced refresh creates or observes that job and reports its status without blocking on provider I/O.

## Refresh Policy

Refresh at service start; every 15 minutes on trading days from 08:30 to 18:00; every two hours outside that window; and every five minutes for candidates whose registration date is today or tomorrow. Deduplicate equivalent jobs and use exponential backoff after failure.

## Retention Policy

Keep current snapshots through 30 days after registration. Retain observations and announcement metadata for three years. Run daily cleanup that soft-deletes obsolete current snapshots while retaining audit history.

## Source Priority and Conflict Rule

For issuer terms and dates, official exchange or CNINFO announcements outrank issuer announcement pages, which outrank Eastmoney issuance lists, which outrank other market data or inferred values. Lower-priority data cannot replace a verified higher-priority field. Equal-priority conflicts retain both observations and mark the snapshot for review. Manual confirmation can override automated data only with operator and reason recorded.

## Presentation Rule

The UI presents update time for fresh data; stale state, last successful time, and reason for overdue data; verified-announcement state for verified issuer terms; and review-required state for equal-priority conflicts. Candidates registering today or tomorrow remain visible and use the existing opportunity semantic even when market fields are stale.
