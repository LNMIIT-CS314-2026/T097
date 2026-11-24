import { one, run } from '../repositories.mjs';
import { choice, roles, textField, requireValue, numberField } from '../validation.mjs';
import { hashPassword } from '../security.mjs';

export function saveAccount(id, actor, b) {
  const old = id ? one('SELECT * FROM users WHERE id=?', id) : null;
  if (id) requireValue(old, 'Account not found.', 404);
  const name = textField(b.fullName, 'Full name'),
    username = textField(b.username, 'Username').toLowerCase();
  requireValue(
    /^[a-z0-9._@-]{2,100}$/.test(username),
    'Use 2–100 letters, digits, dots, hyphens, @ or underscores for the username.',
  );
  requireValue(
    !one('SELECT id FROM users WHERE username=? AND id<>?', username, id || 0),
    'Username is already in use.',
  );
  const role = choice(b.role, roles, 'role'),
    department = textField(b.department, 'Department');
  requireValue(
    one('SELECT name FROM departments WHERE name=?', department),
    'Select an existing department.',
  );
  const active = b.active === false || b.active === 0 ? 0 : 1;
  requireValue(
    id !== actor.id || (active && role === 'admin'),
    'Keep your administrative account active.',
  );
  if (old?.role === 'owner' && (role !== 'owner' || !active)) {
    requireValue(
      !one(
        "SELECT id FROM initiatives WHERE owner_id=? AND status NOT IN ('Completed','Cancelled')",
        id,
      ),
      'Reassign open initiatives before changing this owner account.',
    );
  }
  let hash = old?.password_hash;
  if (!old || b.password) {
    requireValue(
      typeof b.password === 'string' && b.password.length >= 10 && b.password.length <= 256,
      'Enter a password of 10–256 characters.',
    );
    hash = hashPassword(b.password);
  }
  if (!id)
    return Number(
      run(
        'INSERT INTO users(full_name,username,role,department,password_hash,active) VALUES(?,?,?,?,?,?)',
        name,
        username,
        role,
        department,
        hash,
        active,
      ).lastInsertRowid,
    );
  run(
    'UPDATE users SET full_name=?,username=?,role=?,department=?,password_hash=?,active=? WHERE id=?',
    name,
    username,
    role,
    department,
    hash,
    active,
    id,
  );
  if (old.role !== role || old.department !== department || !active || b.password) {
    run('DELETE FROM sessions WHERE user_id=?', id);
  }
  return id;
}
export function saveDepartment(b) {
  const name = textField(b.name, 'Department name');
  const old = b.previous;
  requireValue(!one('SELECT name FROM departments WHERE name=?', name), 'Department already exists.');
  if (old) {
    requireValue(
      run('UPDATE departments SET name=? WHERE name=?', name, old).changes,
      'Department not found.',
      404,
    );
    run('UPDATE users SET department=? WHERE department=?', name, old);
    run('UPDATE reports SET department=? WHERE department=?', name, old);
  } else run('INSERT INTO departments(name) VALUES(?)', name);
  return name;
}
export function saveSettings(b) {
  const days = numberField(b.reminderDays, 'Reminder window');
  requireValue(
    Number.isInteger(days) && days >= 0 && days <= 365,
    'Choose a reminder window of 0 to 365 days.',
  );
  run('UPDATE settings SET reminder_days=? WHERE id=1', days);
  return 1;
}
