# Development and deployment

1. Install Node.js 22.13 or newer with npm. Clone the private team repository using an account with access.
2. From the repository root run `npm ci`, then `npm run build` and `npm start`.
3. Open `http://localhost:4000`. Read the local initial-account file named in the server startup message. Each installation generates its own passwords. The database stores salted scrypt password hashes.
4. For development, run `npm run dev` and open `http://localhost:5173`. Vite forwards API requests to port 4000.

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Express listening port |
| `STRATEGY_DB` | `server/data/strategic-plan.sqlite` | SQLite file location. The server places the initial-account file beside it. |
| `COOKIE_SECURE` | unset | Set to `1` when the site is served over HTTPS so browsers send the session cookie only over HTTPS. |

Database files, write-ahead logs and the generated password file are excluded from Git. Keep the initial-account file accessible only to the installation operator and distribute credentials individually. It can be removed after distribution. An administrator can set replacement passwords from User accounts.

The first launch on an existing prototype database runs a transactional migration preserving IDs, owners, records and history. For a backup, stop the server and copy the data directory as a unit. To restore, use the saved directory with the server stopped. For a separate evaluation installation, point `STRATEGY_DB` to a new file in a private directory. Tests create disposable databases automatically.

The production-style command serves both the compiled React application and API. Keep that process running during the demonstration. Availability on a campus server and long-term production capacity depend on the selected hosting environment.
