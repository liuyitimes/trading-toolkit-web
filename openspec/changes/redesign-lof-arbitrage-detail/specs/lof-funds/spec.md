## ADDED Requirements

### Requirement: LOF arbitrage detail decision view

The Web application SHALL provide a deep-linkable LOF detail view that orders information by arbitrage decision: current premium and cost assumptions, premium persistence, execution capacity, fund holdings exposure, and settlement-window volatility risk. It SHALL identify the instrument, quote timestamp, NAV date, and execution-path verification state before presenting any return estimate.

#### Scenario: A user opens an LOF detail view

- **GIVEN** the user selects an LOF from the supported Web application
- **WHEN** the detail view loads
- **THEN** it presents a decision summary before secondary reference data
- **AND THEN** it separates observed metrics from estimates and unavailable metrics
- **AND THEN** it links back to the LOF list without requiring a stale modal state.

#### Scenario: An execution path is not verified

- **GIVEN** the current subscription, custody-transfer, or expected-sale evidence is incomplete
- **WHEN** the detail view displays a positive premium
- **THEN** it labels the fund as an observation or analysis candidate
- **AND THEN** it does not label the premium or return estimate as executable arbitrage.

### Requirement: LOF detail evidence and unavailable states

The Web application SHALL render source, observation date, retrieval time, and freshness state returned by the LOF detail service for premium history, liquidity history, disclosed fund holdings, and risk inputs. It MUST distinguish fund portfolio holdings from a user's brokerage position and SHALL NOT substitute a local fallback when the service reports an unavailable input.

#### Scenario: Disclosed fund holdings are available

- **GIVEN** a dated official or manager-published portfolio disclosure is available
- **WHEN** the detail service returns holdings exposure
- **THEN** the detail view displays the disclosure date, source, concentration metrics, and top holdings
- **AND THEN** it labels the data as fund portfolio holdings rather than user holdings.

#### Scenario: A required historical or holdings input is unavailable

- **GIVEN** no verified source exists for a requested history or holdings input
- **WHEN** the detail view renders that panel
- **THEN** it shows an explicit unavailable state and its source status
- **AND THEN** it does not substitute zeroes, mock history, or turnover-derived values.

### Requirement: LOF premium persistence, liquidity, and volatility risk disclosure

The Web application SHALL present premium persistence and settlement-window risk returned by the detail service as dated analysis, not as a trade instruction. It SHALL expose the measured window and inputs returned for price, NAV, premium variation, and liquidity rather than recalculating a client-only risk conclusion.

#### Scenario: Sufficient observed history is available

- **GIVEN** the detail service has sufficient dated premium, price, NAV, and liquidity observations
- **WHEN** it builds the detail analysis
- **THEN** it reports the observation window, premium range or duration, liquidity comparison, and volatility measures
- **AND THEN** it separates current observed values from derived risk indicators.

#### Scenario: History is insufficient or simulated

- **GIVEN** the available history is shorter than the documented window or is sourced from a mock fallback
- **WHEN** the detail view renders premium persistence or risk
- **THEN** it marks the analysis unavailable or simulated with the source status
- **AND THEN** it excludes that data from any decision label, risk grade, or expected-return conclusion.
