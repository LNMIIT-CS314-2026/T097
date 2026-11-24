# Strategic Plan Monitoring Dashboard

**Team T097 · CS314 Software Development Laboratory · LNMIIT Jaipur**

The dashboard connects institutional goals to the initiatives, people, milestones and KPIs that deliver them. A department head can see which deadlines need attention. Management can drill down from a goal to its initiatives and compare recorded KPI values with targets.

## Run locally

Use Node.js 22.13 or newer and npm. From the project root run:

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:4000**. On first startup the server creates a local SQLite database, sample planning records and a different random password for each starting account. Open `server/data/strategic-plan.sqlite.accounts.json` on this computer and use the username and password for the role you want. The account file is local to each installation.

| Username | What to try |
| --- | --- |
| `planner` | Create a goal, add a planned initiative, assign an owner, add milestones and submit the initiative for review. |
| `management` | Review a submission, inspect goal and initiative details, filter the dashboard, and generate reports. |
| `owner` or `owner2` | Update assigned work, record a risk, enter KPI measurements and read deadline alerts. |
| `head` | Review progress, KPIs, notifications and reports for the signed-in head’s department. |
| `kpi` | Define an initiative KPI, its target, unit and optional warning threshold. Record the current value. |
| `admin` | Manage accounts and role assignments, change the deadline reminder window and review the activity log. |

**A short demonstration.** As `planner`, create an initiative under an active goal, assign `owner`, open the initiative by title and select **Submit for review**. Approve it from the management review queue. As its owner, save progress and a milestone update together. Refresh the management dashboard, open the linked goal and generate a strategic-plan report. The Reports page can reopen the saved snapshot, print it to PDF or download an Excel workbook.

## Team

| Member | Roll number | Course responsibility |
| --- | --- | --- |
| Nandini Sharma | 24UCS273 | Project / Requirement Lead |
| Darpan Chopra | 24UCS274 | Design / Architecture Lead |
| Aaron Jain (GitHub `GoldleoM`) | 24UCS275 | Development Lead |
| Ajay Singh Bhati | 24UCS276 | Testing & Documentation Lead |

**Category** · Quality, Accreditation and Administration. The team’s SRS specifies agile, incremental development. The repository records the supplied prototype, integration with the course template, and the subsequent implementation and verification. Course responsibilities above come from the SRS.

## Project materials

- [Combined team SRS and Assignments 1–8](docs/requirements/SRS/T097.pdf) and [assignment index](assignments/README.md)
- [Architecture](docs/design/architecture/README.md), [detailed design and SRS decisions](docs/design/detailed-design/README.md) and [screen map](docs/design/UI-design/README.md)
- [Test plan](docs/testing/test-plan/README.md), [case mapping](docs/testing/test-cases/README.md) and [execution results](docs/testing/test-results/README.md)
- [Development and deployment guide](docs/deployment/deployment-guide/README.md)

React pages live in `src/`. Express, SQLite persistence and the application services live in `server/`. The executable test suites live in `tests/`. Start both development servers with `npm run dev`. Run the integration suite with `npm test`.

**AI assistance.** OpenAI Codex assisted with the SRS comparison, implementation, test automation, execution and release documentation for this revision. The team is responsible for reviewing these changes, confirming the documented design choices and making its own course declaration.
