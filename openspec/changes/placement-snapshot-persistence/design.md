# Web Snapshot Metadata Design

The service adds a compatibility payload with `items` and snapshot metadata. The Web store accepts either that object or the legacy array, retaining the existing source-row normalization and placement-premium derivation. Metadata is presentation-only: it does not alter user-controlled expected-profit, safety-pad, score, rating, or sorting calculations.

The view shows freshness only when the server supplies it. `fresh` shows data time, `stale` shows the last successful time and reason, verified issuer terms show their verification state, and equal-priority source conflicts show review required.
