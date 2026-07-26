# Demo Web Delivery Hardening

Status: ready-for-agent

## Problem Statement

The Trading Toolkit Web application depends on a separately deployed Flask API. Without a shared contract, a path or request-method change can silently break a page. The Web delivery path also needs a reproducible Cloudflare Pages deployment and browser-level validation, while avoiding authentication, a Worker proxy, and heavyweight operational work that would slow Demo iteration.

## Solution

Centralize the Web API declarations as method-and-path definitions, verify them against the service endpoint matrix, and run the critical browser workflows in CI. Build and deploy the static application through Cloudflare Pages using a configured Render API base URL. Enable optional Sentry reporting without making it a runtime requirement. Use WSL Ubuntu for every local development, test, build, Docker, deployment rehearsal, and CI-like command.

## User Stories

1. As a Web user, I want market and strategy pages to load after deployment, so that the Demo remains usable.
2. As a Web developer, I want each API wrapper to use a single declared method and path, so that route names do not drift across modules.
3. As a service developer, I want unsupported Web API routes to fail contract verification, so that compatibility problems are found before release.
4. As a developer, I want path parameters encoded consistently, so that codes do not accidentally produce malformed URLs.
5. As a contributor, I want the market page browser smoke test to run in CI, so that a blank or crashing first route is detected.
6. As a contributor, I want the convertible placement workflow browser test to run in CI, so that derived metrics and page interaction remain intact.
7. As a user, I want placement document export to remain verified, so that research output can be produced after a release.
8. As a release owner, I want a production static build before publication, so that invalid bundles do not reach Cloudflare Pages.
9. As an operator, I want Cloudflare Pages to use the configured API base URL, so that API host changes do not require source edits.
10. As an operator, I want Sentry enabled only by an environment value, so that absent monitoring credentials do not prevent the app from mounting.
11. As a security-conscious maintainer, I want dependency and CodeQL scanning, so that pull requests show common risks.
12. As a maintainer, I want the GitHub Pages workflow retained only as a temporary fallback, so that Cloudflare migration can be verified before the older channel is removed.
13. As a China-based Demo user, I want hosting limitations documented honestly, so that Cloudflare Pages is not represented as guaranteed mainland acceleration.
14. As a contributor, I want local commands to run in WSL Ubuntu, so that tooling behavior matches the supported Linux workflow.
15. As a product owner, I want no application login or authorization work in this phase, so that the Demo can continue iterating quickly.

## Implementation Decisions

- API declarations use a uniform method-and-path shape, with a shared parameter substitution helper for dynamic paths. API modules consume these declarations rather than hard-coding duplicate route strings.
- The service endpoint matrix is the compatibility authority for the Web client. The matrix does not make a client-only method a server capability.
- Cloudflare Pages is the primary static hosting target. The browser directly calls the HTTPS Render API URL supplied through `VITE_API_BASE_URL`; no Worker proxy is added.
- Cloudflare Pages and Render Singapore are a best-effort route for China mainland users and do not imply mainland acceleration, ICP compliance, or an SLA.
- Optional front-end Sentry initializes after the Vue application exists and must never prevent mounting when the optional package or DSN is unavailable.
- The CI delivery boundary checks the centralized API modules, core application entry, contract test, browser smoke test, export test, and deployment workflow definitions. Full-repository formatting remains a separate cleanup effort because historical files do not yet conform.
- Dependabot and CodeQL run routinely but do not auto-merge updates.
- GitHub Pages remains a rollback option until Cloudflare Pages has a verified production deployment, configured API URL, and working core routes.
- All local development, test execution, build, Docker use, deployment rehearsal, and CI-like operations use WSL Ubuntu.

## Testing Decisions

- A good test observes the public client behavior: declared request method/path compatibility, a mounted route with content, a user-visible placement flow, and generated export text. It does not test component implementation details or Axios internals.
- The cross-repository API contract test is the primary seam. It reads the service matrix and compares it with the Web API declarations.
- Existing Playwright tests are the highest existing seam for market loading and placement interaction. Existing document export tests are retained for research output.
- The production build is part of the release gate and receives the configured API base URL only through environment configuration.
- Local browser and build verification run under WSL Ubuntu, matching the supported execution environment.

## Out of Scope

- Login, sessions, user authorization, RBAC, and a Worker API proxy.
- Mainland hosting, ICP filing, guaranteed mainland performance, or a service SLA.
- Full visual-regression matrices, routine load testing, and broad performance testing in every pull request.
- Automatic dependency-update merges and a centralized operational dashboard.

## Further Notes

Production setup needs a Cloudflare account token and account ID, a Pages project named `trading-toolkit-web`, and a Render API URL. GitHub branch protection and secret configuration require repository administration. These external credentials should be supplied interactively when the deployment step is reached, not stored in the repository.
