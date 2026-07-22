## ADDED Requirements

### Requirement: Global placement premium assumption

The Web application SHALL provide one locally persisted expected-listing-premium assumption for the convertible-placement strategy. The value SHALL default to 30 percent and SHALL be one of 30, 40, 50, 60, 70, 80, 90, or 100 percent.

#### Scenario: A user has no saved assumption

- **GIVEN** local storage has no placement premium value
- **WHEN** the user opens the convertible placement strategy
- **THEN** the active value is 30 percent
- **AND THEN** the toolbar identifies it as the assumption used for placement metrics.

#### Scenario: A saved value is malformed or unsupported

- **GIVEN** local storage contains a non-numeric value or a value outside the approved set
- **WHEN** the placement store initializes
- **THEN** it uses 30 percent
- **AND THEN** it does not expose the invalid value to placement calculations or controls.

#### Scenario: A user changes or resets the assumption

- **GIVEN** the placement strategy is open
- **WHEN** the user selects an approved value or activates the reset control
- **THEN** the store persists the selected value or 30 percent respectively
- **AND THEN** all placement-only derived metrics update without another API request.

### Requirement: Assumption disclosure

The Web application SHALL identify expected profit, safety pad, score, rating, and composite rank as values calculated with the active placement assumption. It SHALL not present the assumption as a verified return or executable investment outcome.

#### Scenario: A user inspects a placement calculation

- **GIVEN** a candidate has valid placement cost data
- **WHEN** the user views the safety-pad tooltip or the pending-placement detail dialog
- **THEN** the view shows the active premium rate and the resulting expected profit
- **AND THEN** it retains the observation and verification boundary for placement data.
