# Trading Toolkit Context

## Glossary

### Placement Candidate

A convertible-bond original-shareholder placement opportunity that remains relevant to a user before its registration date has passed. A candidate carries issuer terms, registration timing, source evidence, and derived decision-support metrics.

### Placement Snapshot

A time-stamped, locally persisted representation of Placement Candidates used for immediate availability. It is not a permanent assertion of current market facts; it records the source and verification time from which the data was last known.

### Placement Observation

A historical version of a Placement Candidate or one of its source fields. Observations preserve changes in issuer terms, dates, and source evidence for audit and later analysis.

### Stale Placement Snapshot

A Placement Snapshot whose refresh target has elapsed or whose last refresh failed. It remains visible while its candidate is still participation-relevant, and must disclose its data time and stale reason rather than being silently removed.

### Placement Field Provenance

The source evidence attached to a group of placement fields. Issuer terms and registration dates require announcement identity, URL, publication time, and verification time; market fields require provider and observation time; derived metrics require a calculation version and input snapshot reference.

### Placement Refresh Job

An asynchronous task that obtains external placement data and reconciles it into Placement Snapshots and Observations. User-facing reads never wait for this job; a forced refresh requests or observes the job rather than performing provider I/O in the HTTP request.

### Placement Refresh Policy

The scheduling policy for Placement Refresh Jobs: run at service start, every 15 minutes on trading days from 08:30 to 18:00, every two hours otherwise, and every five minutes for candidates registering today or tomorrow. Only one equivalent refresh may run at a time; failures retry with exponential backoff.

### Placement Retention Policy

Placement Snapshots remain available through 30 days after registration. Placement Observations and announcement metadata remain available for three years. Daily cleanup soft-deletes obsolete current snapshots without removing their audit history.

### Placement Source Priority

The conflict rule for Placement Field Provenance: official exchange or CNINFO announcements outrank issuer announcement pages, which outrank Eastmoney issuance lists, which outrank other market data or inferred values. Equal-priority conflicts require review; an auditable manual confirmation may override automated sources.

### Placement Freshness State

The user-visible state of a Placement Snapshot. Fresh data shows its update time; a stale snapshot shows its last successful time and reason; verified issuer terms identify announcement verification; equal-priority conflicts are shown as requiring review. Imminent candidates remain visible regardless of market-field freshness.
