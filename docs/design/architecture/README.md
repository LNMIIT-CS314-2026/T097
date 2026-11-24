# Architecture

A browser sends same-origin JSON requests to one Express server. The server authenticates the session, looks up the current account, checks its role and passes the verified actor to a service. The repository module and prepared SQLite statements provide persistent storage. The React pages display and edit only the data returned for that actor.

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `src/App.jsx`, `src/pages/`, `src/components/` | Login, role navigation, validation feedback, registers, dashboard, details and report output |
| API controller | `server/index.mjs` | Session cookies, route permission checks, transactional writes, response handling and serving the production build |
| Business logic | `server/services/` | Goal and initiative management, review, milestones, KPI calculation, reports, accounts and scoped dashboard assembly |
| Persistence | `server/db.mjs`, `server/migrate.mjs`, `server/repositories.mjs` | Schema creation, legacy migration, indexed reads, notifications and audit history |

**UC-006.** The planning officer submits goal, owner, dates and initiative details. The service validates the active goal and selected owner and creates a Planned initiative at 0%. A management approval activates a submitted initiative after checking its owner.

**UC-009.** The authenticated owner selects an assigned initiative. A single transaction validates and saves progress, optional milestone changes, progress history, notifications and the audit entry. A failure rolls back the transaction.

**UC-015.** Dashboard data is assembled from goals, initiatives, milestones and KPIs. The interface links each goal to its initiatives and each initiative to its own milestones and KPIs. If the KPI or milestone read fails, the dashboard identifies the unavailable section.

The server runs on one machine and shares its SQLite database with all connected browsers. SQLite WAL mode permits concurrent reads. A write transaction takes the lock before evaluating business rules. Deadline checks run at startup, every minute while the server runs, and when a relevant workspace is opened.
