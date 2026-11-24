import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { upgradeDatabase } from './migrate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dbPath = path.resolve(
  process.env.STRATEGY_DB || path.join(here, 'data', 'strategic-plan.sqlite'),
);
const dataDir = path.dirname(dbPath);
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('planner','owner','management','admin')),
    department TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS strategic_goals (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    target_date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS initiatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    goal_id INTEGER NOT NULL REFERENCES strategic_goals(id),
    owner_id INTEGER NOT NULL REFERENCES users(id),
    start_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started','In Progress','Completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initiative_id INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started','In Progress','Completed'))
  );
  CREATE TABLE IF NOT EXISTS kpis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    target_value REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS progress_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initiative_id INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    previous_progress INTEGER NOT NULL,
    new_progress INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

function stamp() {
  return new Date().toISOString();
}

function seedPrototype() {
  db.exec('BEGIN IMMEDIATE;');
  try {
    if (db.prepare('SELECT id FROM users LIMIT 1').get()) {
      db.exec('COMMIT');
      return;
    }

    const addUser = db.prepare('INSERT INTO users(id, full_name, role, department) VALUES(?,?,?,?)');
    addUser.run(1, 'Nandini Sharma', 'planner', 'Planning & Strategy');
    addUser.run(2, 'Neha Sharma', 'owner', 'Research & Innovation');
    addUser.run(3, 'Dr. Meera Joshi', 'management', 'Institute Management');
    addUser.run(4, 'Ajay Singh Bhati', 'owner', 'Industry Relations');

    const addGoal = db.prepare(
      'INSERT INTO strategic_goals(id,title,description,target_date) VALUES(?,?,?,?)',
    );
    addGoal.run(
      1,
      'Enhance Research Output',
      'Improve research quality, publications and lab capabilities across the institute.',
      '2027-06-30',
    );
    addGoal.run(
      2,
      'Improve Teaching & Learning',
      'Strengthen teaching quality, curriculum review and faculty development.',
      '2027-05-31',
    );
    addGoal.run(
      3,
      'Strengthen Industry Collaboration',
      'Develop sustainable partnerships and industry-linked opportunities.',
      '2027-06-30',
    );

    const now = stamp();
    const addInitiative =
      db.prepare(`INSERT INTO initiatives(id,title,description,goal_id,owner_id,start_date,due_date,progress,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
    addInitiative.run(
      1,
      'AI Research Lab Setup',
      'Procure and configure shared equipment for applied AI research.',
      1,
      2,
      '2026-01-15',
      '2026-10-15',
      60,
      'In Progress',
      now,
      now,
    );
    addInitiative.run(
      2,
      'Faculty Development Workshop',
      'Run a faculty workshop series on modern teaching practices.',
      2,
      2,
      '2026-09-10',
      '2026-11-20',
      35,
      'In Progress',
      now,
      now,
    );
    addInitiative.run(
      3,
      'Industry Partnership Portal',
      'Create a structured channel to track active institute-industry partnerships.',
      3,
      4,
      '2026-05-01',
      '2026-08-30',
      100,
      'Completed',
      now,
      now,
    );
    addInitiative.run(
      4,
      'Annual Research Publication Drive',
      'Coordinate and review research publications for the annual reporting cycle.',
      1,
      4,
      '2026-04-01',
      '2026-12-20',
      75,
      'In Progress',
      now,
      now,
    );
    addInitiative.run(
      5,
      'Curriculum Review',
      'Review priority course outlines with department and student feedback.',
      2,
      2,
      '2026-06-01',
      '2026-08-15',
      80,
      'In Progress',
      now,
      now,
    );

    const addMilestone = db.prepare(
      'INSERT INTO milestones(id,initiative_id,title,due_date,status) VALUES(?,?,?,?,?)',
    );
    addMilestone.run(1, 1, 'Finalize equipment requirements', '2026-03-15', 'Completed');
    addMilestone.run(2, 1, 'Purchase equipment', '2026-07-15', 'Completed');
    addMilestone.run(3, 1, 'Install and configure', '2026-10-15', 'In Progress');
    addMilestone.run(4, 2, 'Finalize workshop content', '2026-10-25', 'Completed');
    addMilestone.run(5, 2, 'Conduct workshop sessions', '2026-11-20', 'Not Started');
    addMilestone.run(6, 3, 'Collect partner requirements', '2026-06-01', 'Completed');
    addMilestone.run(7, 3, 'Publish partner portal', '2026-08-30', 'Completed');
    addMilestone.run(8, 4, 'Collect publication records', '2026-09-30', 'Completed');
    addMilestone.run(9, 4, 'Complete annual review', '2026-12-20', 'In Progress');
    addMilestone.run(10, 5, 'Gather course feedback', '2026-07-01', 'Completed');
    addMilestone.run(11, 5, 'Approve revised outlines', '2026-08-15', 'In Progress');

    const addKpi = db.prepare(
      'INSERT INTO kpis(id,goal_id,name,current_value,target_value,unit) VALUES(?,?,?,?,?,?)',
    );
    addKpi.run(1, 1, 'Research papers published', 6, 10, 'papers');
    addKpi.run(2, 1, 'Research labs upgraded', 3, 5, 'labs');
    addKpi.run(3, 2, 'Faculty trained', 52, 80, 'people');
    addKpi.run(4, 2, 'Student satisfaction', 82, 90, '%');
    addKpi.run(5, 3, 'Active industry partners', 7, 12, 'partners');

    const addUpdate = db.prepare(
      `INSERT INTO progress_updates(initiative_id,owner_id,previous_progress,new_progress,status,note,created_at) VALUES(?,?,?,?,?,?,?)`,
    );
    addUpdate.run(
      1,
      2,
      45,
      60,
      'In Progress',
      'Equipment purchase completed; installation is ongoing.',
      '2026-10-21T10:30:00.000Z',
    );
    addUpdate.run(
      2,
      2,
      20,
      35,
      'In Progress',
      'Workshop outline approved by the department.',
      '2026-10-24T08:45:00.000Z',
    );
    addUpdate.run(
      3,
      4,
      85,
      100,
      'Completed',
      'Portal released to the industry relations team.',
      '2026-09-01T12:00:00.000Z',
    );

    const addNotification = db.prepare(
      'INSERT INTO notifications(user_id,message,is_read,created_at) VALUES(?,?,?,?)',
    );
    addNotification.run(
      2,
      'AI Research Lab Setup is past its target date and remains in progress.',
      0,
      '2026-10-20T09:00:00.000Z',
    );
    addNotification.run(
      2,
      'Curriculum Review needs attention: the target date has passed.',
      0,
      '2026-10-20T09:05:00.000Z',
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get();
if (count.n === 0 && !db.prepare('PRAGMA user_version').get().user_version) seedPrototype();
upgradeDatabase(db, dbPath);

export function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
