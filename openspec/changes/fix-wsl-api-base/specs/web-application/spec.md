## MODIFIED Requirements

### Requirement: WSL local delivery

The Web repository SHALL provide a versioned WSL operator workflow that validates the Web build before restarting the local Web and service processes. The local build SHALL use `http://127.0.0.1:8080` as its API base URL.

#### Scenario: A local convertible page loads

- GIVEN an operator deploys the WSL local workflow
- WHEN the preview application requests pending convertible data
- THEN the request targets the local Flask service
- AND THEN it does not receive the preview HTML document as an API response.
