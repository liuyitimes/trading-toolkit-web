## ADDED Requirements

### Requirement: Convertible strategy condition disclosure

The Web convertible workspace SHALL provide an expandable strategy-conditions disclosure for the active tab. The disclosure SHALL distinguish screen inclusion conditions, calculation or ranking semantics, and the condition required before the observation can be treated as an executable action.

#### Scenario: A user selects a strategy tab

- **GIVEN** the user is viewing a convertible strategy tab
- **WHEN** the tab data or its strategy guide is rendered
- **THEN** the user can expand a strategy-conditions disclosure for that tab
- **AND THEN** the disclosure identifies the active strategy by name.

#### Scenario: A signal is only a screen observation

- **GIVEN** a strategy depends on market price, premium, or a derived threshold
- **WHEN** its conditions are disclosed
- **THEN** the disclosure states that the result is an observation screen
- **AND THEN** it does not describe the result as an order instruction, guaranteed profit, or confirmed issuer event.

### Requirement: Rule-aligned signal conditions

The disclosure SHALL state the service's current signal conditions and default ordering without substituting informal UI heuristics for the screen rules.

#### Scenario: A user views the double-low strategy

- **GIVEN** the active tab is double-low
- **WHEN** its conditions are rendered
- **THEN** the disclosure states that rows have nonzero premium rate and conversion value of at least 10 before the 20 lowest double-low values are selected
- **AND THEN** it defines double-low as bond price plus premium rate and states that the table defaults to ascending double-low ordering.

#### Scenario: A user views the force-redemption strategy

- **GIVEN** the active tab is force redemption
- **WHEN** its conditions are rendered
- **THEN** the disclosure states the screen requires premium rate below 10 percent and bond price from 105 through 140 before returning up to 10 rows
- **AND THEN** it states that price proximity to the trigger line does not prove the issuer-specific consecutive-trading-day clause has been satisfied.

#### Scenario: A user views the discount strategy

- **GIVEN** the active tab is discount
- **WHEN** its conditions are rendered
- **THEN** the disclosure states the screen requires a negative premium rate before returning up to 10 rows
- **AND THEN** it defines conversion value and explains that the default ordering places larger absolute negative premiums first.

#### Scenario: A user views the down-revision strategy

- **GIVEN** the active tab is down revision
- **WHEN** its conditions are rendered
- **THEN** the disclosure states the screen requires premium rate above 50 percent and bond price below 115 before returning up to 10 rows
- **AND THEN** it states that the displayed 85 percent conversion-price line is a strategy benchmark rather than a verified issuer-specific down-revision clause.

### Requirement: Placement decision boundary disclosure

The placement strategy disclosure SHALL retain the distinction between a planning observation and a verified executable opportunity.

#### Scenario: A pending placement record lacks verified issuer evidence

- **GIVEN** a placement record has market or issuance fields but no verified placement evidence
- **WHEN** its conditions are rendered
- **THEN** the disclosure requires verification of eligibility, record date, allocation terms, payment timing, announcement date, and announcement URL before execution
- **AND THEN** it identifies any 20 percent first-day premium used by the score as a comparison assumption rather than a verified return.
