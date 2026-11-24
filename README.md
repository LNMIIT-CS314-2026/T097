# Team T097 — Strategic Plan Monitoring Dashboard

**CS314 · Software Development Laboratory · Prototype implementation**

This implementation is based on the three detailed use cases in the T097 SRS:

- **UC-006 — Manage Strategic Initiative** (Strategic Planning Officer)
- **UC-009 — Update Initiative Progress** (Initiative Owner)
- **UC-015 — Monitor Strategic Plan Performance** (Institute Management)

The SRS specifies a web application, centralized database, role-aware workflows, and components including Dashboard UI, Initiative Management, Milestone Management, KPI & Reporting, Notification Service and a Data Access Layer. It does **not** mandate a specific programming language, framework or database product. React, Express and SQLite are the implementation choices selected for this prototype.

## Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite | Component-based user interface, forms, navigation and state updates |
| Styling | CSS | Responsive layouts, tables, forms and dashboard visual design |
| API | Node.js + Express | REST endpoints, HTTP validation responses and role-gated demo actions |
| Service layer | JavaScript modules | Use-case/business-rule validation and orchestration |
| Data Access Layer | Repository modules | Encapsulates SQL queries and persistence operations |
| Central database | SQLite file managed by the server | Shared source of truth for goals, initiatives, owners, milestones, KPIs, progress history and notifications |

> **Central database clarification:** the database file lives on the server, not in the browser. All application data is read/written through `/api` endpoints. Every browser connected to the same running server sees the same database. SQLite is appropriate for a local/evaluation prototype; for a multi-instance production deployment, the repository layer can be adapted to PostgreSQL without changing the React components or most use-case logic.

## Run locally

**Requirements:** Node.js **22.12 or later** and npm.

1. Extract the ZIP and open a terminal in this folder.
2. Install the dependencies:

   ```bash
   npm install
   ```

3. Start the frontend and API in development mode:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in a browser.

The Express API listens on `http://localhost:4000`. Vite forwards `/api` requests to the API server. The SQLite file is created automatically at `server/data/strategic-plan.sqlite` and seeded with demonstration records on first start.

### Production-style local run

```bash
npm run build
npm start
```

Then open `http://localhost:4000`. The Express server serves the built React app and API from one origin.

## Demo sequence for the viva

### 1. UC-015 — Monitor Strategic Plan Performance

Use **Institute Management**. Explain the summary cards, goal-progress view, KPI current values versus targets, overdue initiatives/milestones, recent progress updates and clickable initiative details. These values are loaded from the server API and database, not a browser-local fixture.

### 2. UC-006 — Manage Strategic Initiative

Switch to **Strategic Planning Officer** and open **Manage initiatives**. Create or edit an initiative, select an existing goal, assign an owner, fill dates and save. Try omitting a required field or selecting a target date earlier than the start date to demonstrate validation.

### 3. UC-009 — Update Initiative Progress

Switch to **Initiative Owner**. The demo owner is Neha Sharma. Select an assigned initiative, change progress/status, add a progress note, and save. Then change a milestone status. Return to the management dashboard and show the update is reflected there.

### 4. Show persistence

Refresh the browser, or open a second browser tab to `http://localhost:5173`. The saved data should remain because it is stored by the API server in SQLite. The reset icon restores the seeded demonstration records.

## Project structure

```text
src/
  App.jsx                   App state and page routing
  api.js                    HTTP client for /api endpoints
  components/
    Sidebar.jsx             Role-aware navigation
    Topbar.jsx              Role preview, page title and reset action
    StatCard.jsx            Dashboard metric component
    StatusPill.jsx          Reusable status indicator
    InitiativeTable.jsx     Reusable initiatives table
    InitiativeForm.jsx      Create/edit initiative form
    InitiativeDetails.jsx   Initiative detail and milestone modal
    Modal.jsx               Reusable modal shell
  pages/
    DashboardPage.jsx       Management performance overview
    InitiativesPage.jsx     Initiative register (UC-006)
    ProgressPage.jsx        Owner progress workflow (UC-009)
    KpiPage.jsx              KPI performance details (UC-015)
server/
  index.mjs                 Express API/controller routes
  db.mjs                    SQLite schema and seed/reset data
  repositories.mjs           Data Access Layer (SQL/repositories)
  services/
    strategicPlanService.mjs Business rules and use-case orchestration
  data/
    strategic-plan.sqlite    Generated database file (not committed)
docs/
  architecture.md           Architecture and SRS traceability
  Viva-Cheat-Sheet.md       Comprehensive viva notes, demo script & defense guide
```

## Architecture

```text
React pages and reusable UI components
                 |
                 v
         api.js (HTTP client)
                 |
                 v
      Express REST controller
                 |
                 v
 Strategic Plan Service Layer
 (validation, progress, overdue rules)
                 |
                 v
       Repository / Data Access Layer
 (goals, initiatives, milestones, KPIs,
  progress history, notifications, users)
                 |
                 v
       Central SQLite Database
```

The implementation follows a component-oriented frontend and layered server architecture. Routes do not contain SQL statements; SQL is encapsulated in the repository module and business logic is placed in the service layer.

## Prototype boundary and viva honesty

- The role selector is a **demo-role preview**, not real authentication. The API checks a demo role header to prevent accidental cross-role actions during the evaluation; this header can be forged, so it is **not a security mechanism**.
- Data is demonstration data. Do not present it as actual institutional KPI data.
- This prototype implements the selected use-case slice; it is not a complete institute ERP or production release.
- Production work still needs institutional authentication, server-enforced authorization based on verified identities, secrets/configuration management, backup/restore, audit policy, automated tests, deployment hardening and review with actual data owners.
- The central SQLite database supports this single-server prototype. For a deployed multi-server service, PostgreSQL would be the recommended database migration target.

## Validation and reset

- Initiative title, valid goal, valid owner, date formats/order, status and 0–100 progress are checked in the service layer.
- An initiative past its target date is shown as **Delayed** when its persisted status is not **Completed**.
- Owner progress updates are stored in progress history and surfaced in the dashboard.
- Overdue progress updates can generate notification records.
- Use the circular-arrow button to reset demonstration data.

## Checks

```bash
npm run check
npm run build
```

AI-assisted code was used while assembling this prototype. The team should inspect, adapt, test and disclose use in the manner required by the course AI-use policy before submitting or presenting it.
