import fs from 'node:fs';
import { hashPassword, randomToken } from './security.mjs';

export function upgradeDatabase(db, dbPath) {
  if (db.prepare('PRAGMA user_version').get().user_version >= 1) return;
  db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');
  try {
    if (!db.prepare('PRAGMA user_version').get().user_version) {
      migrateRecords(db);
      provisionAccounts(db, dbPath);
      if (db.prepare('PRAGMA foreign_key_check').all().length)
        throw Error('Database references failed validation.');
      db.exec('PRAGMA user_version=1');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys=ON');
  }
}

function migrateRecords(db) {
  db.exec(`
    CREATE TABLE accounts_v1 (
      id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, role TEXT NOT NULL
        CHECK(role IN ('planner','owner','head','kpi','management','admin')),
      department TEXT NOT NULL DEFAULT '', username TEXT UNIQUE COLLATE NOCASE,
      password_hash TEXT, active INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO accounts_v1(id,full_name,role,department) SELECT id,full_name,role,department FROM users;
    DROP TABLE users;
    ALTER TABLE accounts_v1 RENAME TO users;
    CREATE TABLE departments (name TEXT PRIMARY KEY COLLATE NOCASE);
    INSERT INTO departments SELECT DISTINCT department FROM users WHERE department <> '';
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE audit (id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), event TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), reminder_days INTEGER NOT NULL DEFAULT 7);
    INSERT INTO settings(id) VALUES(1);
    ALTER TABLE strategic_goals ADD COLUMN start_date TEXT NOT NULL DEFAULT '2026-01-01';
    ALTER TABLE strategic_goals ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';
    ALTER TABLE strategic_goals ADD COLUMN review TEXT NOT NULL DEFAULT 'Approved';
    CREATE TABLE initiatives_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      goal_id INTEGER NOT NULL REFERENCES strategic_goals(id), owner_id INTEGER REFERENCES users(id),
      start_date TEXT NOT NULL, due_date TEXT NOT NULL, progress INTEGER NOT NULL CHECK(progress BETWEEN 0 AND 100),
      status TEXT NOT NULL CHECK(status IN ('Planned','In Progress','Completed','Cancelled')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, review TEXT NOT NULL DEFAULT 'Draft'
    );
    INSERT INTO initiatives_v1 SELECT id,title,description,goal_id,owner_id,start_date,due_date,progress,
      CASE status WHEN 'Not Started' THEN 'Planned' ELSE status END,created_at,updated_at,'Approved' FROM initiatives;
    DROP TABLE initiatives;
    ALTER TABLE initiatives_v1 RENAME TO initiatives;
    CREATE TABLE milestones_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, initiative_id INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', due_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Not Started','In Progress','Completed','Cancelled')),
      progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), required INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO milestones_v1(id,initiative_id,title,due_date,status,progress)
      SELECT id,initiative_id,title,due_date,status,CASE status WHEN 'Completed' THEN 100 ELSE 0 END FROM milestones;
    DROP TABLE milestones;
    ALTER TABLE milestones_v1 RENAME TO milestones;
    CREATE TABLE kpis_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, goal_id INTEGER REFERENCES strategic_goals(id),
      initiative_id INTEGER REFERENCES initiatives(id), name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      current_value REAL, target_value REAL, unit TEXT NOT NULL DEFAULT '', threshold REAL
    );
    INSERT INTO kpis_v1(id,goal_id,name,current_value,target_value,unit)
      SELECT id,goal_id,name,current_value,target_value,unit FROM kpis;
    DROP TABLE kpis;
    ALTER TABLE kpis_v1 RENAME TO kpis;
    CREATE TABLE risks (id INTEGER PRIMARY KEY, initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
      title TEXT NOT NULL, mitigation TEXT NOT NULL DEFAULT '', status TEXT NOT NULL);
    ALTER TABLE notifications ADD COLUMN event_key TEXT;
    CREATE UNIQUE INDEX notification_once ON notifications(user_id,event_key);
    CREATE TABLE reports (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL, department TEXT NOT NULL, kind TEXT NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX initiatives_owner ON initiatives(owner_id);
    CREATE INDEX initiatives_goal ON initiatives(goal_id);
    CREATE INDEX milestones_parent ON milestones(initiative_id);
    CREATE INDEX kpis_parent ON kpis(initiative_id);
  `);
  // Only the five known prototype indicators have a known project association.
  const links = [
    [1, 'Research papers published', 4],
    [2, 'Research labs upgraded', 1],
    [3, 'Faculty trained', 2],
    [4, 'Student satisfaction', 5],
    [5, 'Active industry partners', 3],
  ];
  const link = db.prepare(
    'UPDATE kpis SET initiative_id=? WHERE id=? AND name=? AND goal_id=(SELECT goal_id FROM initiatives WHERE id=?)',
  );
  for (const [id, name, parent] of links) link.run(parent, id, name, parent);
}

function provisionAccounts(db, dbPath) {
  const extra = [
    ['Department Head', 'head', 'Research & Innovation'],
    ['Performance Officer', 'kpi', 'Planning & Strategy'],
    ['System Administrator', 'admin', 'Administration'],
  ];
  for (const [name, role, department] of extra) {
    if (!db.prepare('SELECT id FROM users WHERE role=?').get(role)) {
      db.prepare('INSERT OR IGNORE INTO departments VALUES(?)').run(department);
      db.prepare('INSERT INTO users(full_name,role,department) VALUES(?,?,?)').run(
        name,
        role,
        department,
      );
    }
  }
  const accounts = db.prepare('SELECT id,role FROM users ORDER BY id').all();
  const counts = new Map();
  const credentials = accounts.map(({ id, role }) => {
    const count = (counts.get(role) || 0) + 1;
    counts.set(role, count);
    return { id, username: count === 1 ? role : role + count, password: randomToken().slice(0, 18) };
  });
  const filename = dbPath + '.accounts.json';
  // Reuse a provision file if startup was interrupted before the transaction committed.
  if (!fs.existsSync(filename))
    fs.writeFileSync(filename, JSON.stringify(credentials, null, 2), { flag: 'wx', mode: 0o600 });
  const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const { id, username } of credentials) {
    const account = saved.find((item) => item.id === id && item.username === username);
    if (!account) throw Error('Initial account file does not match this database.');
    db.prepare('UPDATE users SET username=?,password_hash=? WHERE id=?').run(
      username,
      hashPassword(account.password),
      id,
    );
  }
}
