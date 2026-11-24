import { db } from './db.mjs';

export const userRepository = {
  list() {
    return db.prepare('SELECT id, full_name AS fullName, role, department FROM users ORDER BY id').all();
  },
  findById(id) {
    return db.prepare('SELECT id, full_name AS fullName, role, department FROM users WHERE id=?').get(id) || null;
  },
  listOwners() {
    return db.prepare("SELECT id, full_name AS fullName, role, department FROM users WHERE role='owner' ORDER BY full_name").all();
  },
};

export const goalRepository = {
  list() {
    return db.prepare('SELECT id, title, description, target_date AS targetDate FROM strategic_goals ORDER BY id').all();
  },
  exists(id) {
    return Boolean(db.prepare('SELECT id FROM strategic_goals WHERE id=?').get(id));
  },
};

export const initiativeRepository = {
  listIds() {
    return db.prepare('SELECT id FROM initiatives ORDER BY due_date, id').all();
  },
  findById(id) {
    return db.prepare('SELECT * FROM initiatives WHERE id=?').get(id) || null;
  },
  findDetails(id) {
    return db.prepare(`SELECT i.*, g.title AS goal_title, u.full_name AS owner_name
      FROM initiatives i JOIN strategic_goals g ON g.id=i.goal_id
      JOIN users u ON u.id=i.owner_id WHERE i.id=?`).get(id) || null;
  },
  create({ title, description, goalId, ownerId, startDate, dueDate, progress, status, now }) {
    return db.prepare(`INSERT INTO initiatives(title,description,goal_id,owner_id,start_date,due_date,progress,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(title, description, goalId, ownerId, startDate, dueDate, progress, status, now, now);
  },
  update(id, { title, description, goalId, ownerId, startDate, dueDate, progress, status, now }) {
    return db.prepare(`UPDATE initiatives SET title=?,description=?,goal_id=?,owner_id=?,start_date=?,due_date=?,progress=?,status=?,updated_at=? WHERE id=?`)
      .run(title, description, goalId, ownerId, startDate, dueDate, progress, status, now, id);
  },
  saveProgress(id, progress, status, now) {
    db.prepare('UPDATE initiatives SET progress=?,status=?,updated_at=? WHERE id=?').run(progress, status, now, id);
  },
};

export const milestoneRepository = {
  listAll() {
    return db.prepare(`SELECT m.id,m.initiative_id AS initiativeId,m.title,m.due_date AS dueDate,m.status,
      i.title AS initiativeTitle,i.owner_id AS ownerId,u.full_name AS ownerName
      FROM milestones m JOIN initiatives i ON i.id=m.initiative_id
      JOIN users u ON u.id=i.owner_id ORDER BY m.due_date`).all();
  },
  findWithOwner(id) {
    return db.prepare(`SELECT m.*,i.owner_id AS owner_id FROM milestones m JOIN initiatives i ON i.id=m.initiative_id WHERE m.id=?`).get(id) || null;
  },
  updateStatus(id, status) {
    return db.prepare('UPDATE milestones SET status=? WHERE id=?').run(status, id);
  },
};

export const kpiRepository = {
  listAll() {
    return db.prepare(`SELECT k.id,k.goal_id AS goalId,g.title AS goalTitle,k.name,
      k.current_value AS currentValue,k.target_value AS targetValue,k.unit,
      CASE WHEN k.target_value>0 THEN MIN(100,ROUND((k.current_value/k.target_value)*100)) ELSE 0 END AS progressPct
      FROM kpis k JOIN strategic_goals g ON g.id=k.goal_id ORDER BY k.id`).all();
  },
};

export const progressUpdateRepository = {
  create({ initiativeId, ownerId, previousProgress, newProgress, status, note, createdAt }) {
    return db.prepare(`INSERT INTO progress_updates(initiative_id,owner_id,previous_progress,new_progress,status,note,created_at)
      VALUES(?,?,?,?,?,?,?)`).run(initiativeId, ownerId, previousProgress, newProgress, status, note, createdAt);
  },
  listRecent(limit = 8) {
    return db.prepare(`SELECT p.id,p.initiative_id AS initiativeId,i.title AS initiativeTitle,
      p.owner_id AS ownerId,u.full_name AS ownerName,p.previous_progress AS previousProgress,
      p.new_progress AS newProgress,p.status,p.note,p.created_at AS createdAt
      FROM progress_updates p JOIN initiatives i ON i.id=p.initiative_id
      JOIN users u ON u.id=p.owner_id ORDER BY p.created_at DESC LIMIT ?`).all(limit);
  },
};

export const notificationRepository = {
  create({ userId, message, createdAt }) {
    return db.prepare('INSERT INTO notifications(user_id,message,is_read,created_at) VALUES(?,?,0,?)').run(userId, message, createdAt);
  },
  listRecent(limit = 10) {
    return db.prepare(`SELECT n.id,n.user_id AS userId,u.full_name AS userName,n.message,
      n.is_read AS isRead,n.created_at AS createdAt FROM notifications n
      JOIN users u ON u.id=n.user_id ORDER BY n.created_at DESC LIMIT ?`).all(limit).map(n => ({ ...n, isRead: Boolean(n.isRead) }));
  },
};
