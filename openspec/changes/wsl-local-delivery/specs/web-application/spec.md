## ADDED Requirements

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
