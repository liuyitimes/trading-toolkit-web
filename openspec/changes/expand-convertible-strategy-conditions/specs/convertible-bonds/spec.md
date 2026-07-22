## ADDED Requirements

### Requirement: Signal interpretation boundary

The Web signal view SHALL disclose when a derived indicator is a proximity or screening measure and SHALL not label it as a confirmed corporate action without issuer-specific evidence.

#### Scenario: The screen shows a force-redemption proximity

- **GIVEN** a bond has a force-redemption trigger price from its source data or the 130 percent conversion-price fallback
- **WHEN** the Web view presents the gap between stock price and that price
- **THEN** it labels the result as a proximity or observation measure
- **AND THEN** it does not state that the issuer has triggered redemption solely from the current gap.

#### Scenario: The screen shows a down-revision proximity

- **GIVEN** a bond has a down-revision strategy benchmark of 85 percent of conversion price
- **WHEN** the Web view presents the gap between stock price and that benchmark
- **THEN** it labels the result as an observation measure
- **AND THEN** it does not state that down revision has been triggered or will occur without the bond's issuer-specific terms and approvals.
