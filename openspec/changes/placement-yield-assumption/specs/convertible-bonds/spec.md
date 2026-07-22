## MODIFIED Requirements

### Requirement: Placement score assumptions

The Web placement view SHALL calculate expected profit, safety pad, placement score, rating, and composite rank from the active global expected-listing-premium assumption. The assumption SHALL be comparison-only, SHALL NOT be presented as a verified return, and SHALL override API-provided display values for those derived metrics while retaining their source values.

#### Scenario: A safety pad is shown

- **GIVEN** the system has required placement and stock fields
- **WHEN** it calculates the placement metrics for an approved premium assumption
- **THEN** expected profit equals 1,000 yuan multiplied by that premium percentage
- **AND THEN** safety pad equals expected profit divided by actual one-lot placement cost multiplied by 100 percent.

#### Scenario: A placement score is recalculated

- **GIVEN** a placement candidate has issue size, tradable amount, and valid placement cost data
- **WHEN** the user changes the approved premium assumption
- **THEN** the Web score recalculates with issue-size, tradable-amount, and safety-pad weights of 30, 40, and 30
- **AND THEN** ratings are recommend at 80 or greater, watch from 60 through 79, and cautious below 60.

#### Scenario: Placement data cannot produce a safety pad

- **GIVEN** a placement candidate has no positive actual one-lot cost
- **WHEN** the Web derives placement metrics
- **THEN** it shows expected profit from the active assumption
- **AND THEN** it renders safety pad as unavailable and does not divide by zero.
