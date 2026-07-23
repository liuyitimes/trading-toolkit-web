# Fix WSL API Base URL

The WSL local-delivery build inherited the cloud production API base URL, allowing preview requests to resolve to the Web server rather than the local Flask service. The deploy workflow must inject its local API base while retaining cloud environment configuration for cloud deployments.
