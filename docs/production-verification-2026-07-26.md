# Production Verification and Performance Report

Date: 2026-07-26

## Scope

- Frontend: `https://trading-toolkit-web.pages.dev/`
- API: `https://trading-toolkit-api.onrender.com`
- Test environment: WSL Ubuntu, IPv4, HTTP/1.1, production endpoints

## Functional and Stability Checks

| Check                   | Result                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Frontend availability   | 6/6 requests returned HTTP 200                                                        |
| API health availability | 6/6 requests returned HTTP 200                                                        |
| API business data       | `GET /api/v1/convertible/pending` returned `success: true`                            |
| API health payload      | `/healthz` returned `success: true`, `status: ok`                                     |
| CORS preflight          | `OPTIONS /api/v1/convertible/pending` allowed `https://trading-toolkit-web.pages.dev` |
| Production build assets | HTML references the expected hashed JavaScript and CSS assets, all returned HTTP 200  |

Observed response-time samples during the repeated check:

| Endpoint            | Range          |
| ------------------- | -------------- |
| Frontend homepage   | 0.70s to 1.68s |
| API health endpoint | 0.79s to 1.28s |

This confirms short-run availability from the test network. It is not a substitute for multi-region or 24-hour uptime monitoring. Render free services may add a cold-start delay after inactivity.

## Resource Performance Measurements

| Resource          | Transfer size before compression |  TTFB | Total |
| ----------------- | -------------------------------: | ----: | ----: |
| HTML document     |                            649 B | 0.30s | 0.30s |
| Main JavaScript   |                          1.11 MB | 1.00s | 2.55s |
| Vue runtime chunk |                            64 KB | 0.88s | 1.15s |
| Main stylesheet   |                           370 KB | 1.44s | 2.35s |
| Rollup runtime    |                            694 B | 0.61s | 0.61s |

Cloudflare serves Brotli for the main JavaScript when the client advertises it. Before this change, Pages returned `Cache-Control: public, max-age=0, must-revalidate` for hashed static assets, so repeat visits unnecessarily revalidated the largest files.

## Improvement Applied

`public/_headers` marks `/assets/*` as immutable for one year. Vite emits content-hashed asset filenames, so a release creates new URLs whenever their content changes. This makes the cache policy safe and improves repeat-visit performance without slowing iteration.

The initial Pages deployment still returned `Cache-Control: public, max-age=0, must-revalidate`. Its log showed that `cloudflare/pages-action@v1` used deprecated Wrangler 2, which did not apply the header manifest. The workflow now explicitly uses Wrangler 4, and production verification confirms `Cache-Control: public, max-age=31536000, immutable` for the main JavaScript asset.

## Remaining Performance Work

1. Split the 1.11 MB application bundle by feature route and lazily load infrequent panels.
2. Audit Element Plus imports and eliminate unused component styles to reduce the 370 KB stylesheet.
3. Add scheduled multi-region synthetic checks before claiming a China-mainland availability target.
4. Add a Lighthouse CI workflow once a browser runner is available; Google PageSpeed's anonymous API currently reports zero daily quota, and the WSL browser download was blocked by an unavailable browser package source.

## Deployment and Domain Status

- Cloudflare Pages and Render production checks passed.
- Free-domain request submitted: `trading-toolkit.js.org` via JS.ORG PR #12051.
- The domain cannot resolve until JS.ORG reviews and publishes its DNS record. Cloudflare Pages must then accept the custom-domain mapping; this was not completed because the Cloudflare dashboard login redirect was blocked by the browser security policy.
- Continue using `https://trading-toolkit-web.pages.dev/` until both external steps complete.
