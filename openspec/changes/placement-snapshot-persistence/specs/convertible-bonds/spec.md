## MODIFIED Requirements

### Requirement: Placement eligibility evidence

The Web SHALL distinguish a placement observation from a verified executable opportunity. A verified executable record requires issuer evidence for eligibility, record date, allocation terms, payment timing, and relevant announcement date and URL. When snapshot metadata is present, it SHALL display the freshness state, the data time, and any review-required state without concealing a candidate that remains relevant through its registration date.

#### Scenario: A stale imminent candidate is returned

- GIVEN a snapshot has stale market fields and a candidate registers today or tomorrow
- WHEN the placement strategy is rendered
- THEN the candidate remains visible
- AND THEN the UI identifies its last successful time and stale reason.

#### Scenario: A legacy service payload is returned

- GIVEN the service returns the existing list-only pending payload
- WHEN the placement strategy is rendered
- THEN the existing placement list remains usable
- AND THEN no unavailable freshness claim is shown.
