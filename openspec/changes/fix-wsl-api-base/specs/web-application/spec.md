## MODIFIED Requirements

### Requirement: WSL local delivery

The Web repository SHALL provide a versioned WSL operator workflow that validates the Web build before restarting the local Web and service processes. The local workflow SHALL proxy same-origin `/api` requests to `http://127.0.0.1:8080`.

#### Scenario: A local convertible page loads

- GIVEN an operator deploys the WSL local workflow
- WHEN the local Web application requests pending convertible data
- THEN the browser sends a same-origin `/api` request
- AND THEN the local workflow forwards it to the Flask service rather than returning the Web HTML document.
