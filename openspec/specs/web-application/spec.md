# Web Application Specification

## Purpose

Define supported Web routes, interaction principles, and client behavior.
## Requirements
### Requirement: Supported Web routes

The Web application SHALL provide routes for home, convertible monitoring and detail, LOF, closed-end funds, Hong Kong IPO and detail, favorites, settings, quote management, and API logs.

#### Scenario: A route is loaded directly

- GIVEN a supported route is requested in the Web application
- WHEN the router initializes
- THEN it resolves through the shared layout and its corresponding lazy-loaded view.

### Requirement: Normalized API consumption

The shared Axios client SHALL unwrap successful `{ success, data, meta }` envelopes and reject unsuccessful envelopes. A configurable base URL MAY be read from the build environment or local storage.

#### Scenario: A service request succeeds

- GIVEN the service returns a successful envelope
- WHEN the Axios response interceptor handles it
- THEN callers receive the inner `data`
- AND application code need not parse provider-specific response formats.

### Requirement: Decision-support presentation

The Web experience SHALL present finance data as research and decision support, with progressive disclosure for formulas, assumptions, and detailed calculations. It SHALL not present assumptions or stale data as confirmed investment outcomes.

#### Scenario: A user inspects a calculated metric

- GIVEN the page displays a derived strategy metric
- WHEN the user requests explanation through the available interaction
- THEN the view exposes the relevant inputs, formula, and assumptions.

### Requirement: Market marker consistency

Mainland exchange markers in supported Web surfaces SHALL use `ExchangeBadge`. Strategy labels SHALL use red for positive opportunities, yellow for neutral states, and green for risks or negative states, as defined by the project UI convention.

#### Scenario: A list renders an exchange

- GIVEN an item has a mainland exchange value
- WHEN the view renders its market marker
- THEN it uses `ExchangeBadge` rather than duplicating exchange-label logic.

### Requirement: Responsive verification

User-visible Web changes SHALL be verified at relevant desktop and mobile dimensions, including absence of console errors and coherent layout for the affected interaction.

#### Scenario: A placement-dialog layout changes

- GIVEN a change affects the convertible placement dialog
- WHEN verification runs
- THEN it checks desktop and small-screen rendering
- AND it confirms scrollable content is not clipped or overlapped.

### Requirement: WSL local delivery
The Web repository SHALL provide a versioned WSL operator workflow that validates the Web build before restarting the local Web and service processes.

#### Scenario: A local deployment succeeds
- GIVEN the Web checkout is buildable and the service checkout has no non-database local changes
- WHEN an operator runs the deploy command
- THEN the workflow restarts the managed WSL services
- AND THEN it verifies HTTP reachability on ports 5173 and 8080.

#### Scenario: Local service code is modified
- GIVEN the service checkout contains a modification other than its SQLite database
- WHEN an operator runs the deploy command
- THEN the workflow SHALL stop before restarting services.
