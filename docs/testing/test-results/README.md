# Release verification · 24 November 2026

A clean lockfile install, syntax checks and the Vite production build succeeded on Windows with Node.js 24.19.0. The [TAP run](integration.tap) records 46 passing API/database integration tests, zero failures and zero skips.

| Assignment 8 group | Designed | Executed at API/database level | Passed |
| --- | ---: | ---: | ---: |
| UC-006 · TC-001–012 | 12 | 12 | 12 |
| UC-009 · TC-013–027 | 15 | 15 | 15 |
| UC-015 · TC-028–040 | 13 | 13 | 13 |
| **Total** | **40** | **40** | **40** |

Assignment 8 execution and pass percentages are both 100% at the tested layer. Six additional cases passed for transaction rollback, concurrent saves, scheduled reminders, the end-to-end role workflow, report isolation/export and account/session changes. TC-012 and TC-040 deliberately trigger a failed write and an unavailable KPI table in isolated databases. Their expected error messages appear in the log.

| Browser run on Windows | Version | Result |
| --- | --- | --- |
| Google Chrome | 158.0.8127.37 | Pass |
| Microsoft Edge | 158.0.4370.33 | Pass |
| Playwright Firefox | 159.0 | Pass |
| Playwright WebKit | 27.2 | Pass |
| Playwright Chromium | 159.0.8154.6 | Pass |

Each browser used the compiled React build. The walkthrough signed in as all six roles, created a goal and initiative, submitted and approved a review, rejected a premature completion, then saved the final milestone and 100% initiative progress together. It also checked KPI entry, goal and initiative details, Excel download, print view, persisted report retrieval, role administration, mobile-width layout and logout. Chromium-family runs additionally generated PDF bytes. WebKit coverage is an engine-level check. Native Safari was not exercised on this Windows host.

A migration rehearsal on a copy of the existing prototype database retained all five initiatives, eleven milestones, five KPIs and three progress-history entries. Four previous users were preserved and three missing SRS roles were provisioned. SQLite's integrity and foreign-key checks passed.

Numerical KPI and goal checks use the [release's documented conventions](../../design/detailed-design/README.md). Team sign-off, institutional uptime and production load acceptance remain separate from this local test execution. The original Assignment 8 submission preserves the earlier design-stage results.
