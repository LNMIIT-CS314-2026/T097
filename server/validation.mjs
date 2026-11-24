export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireValue(condition, message, status) {
  if (!condition) throw new InputError(message, status);
}
export function textField(value, label, required = true) {
  const text = typeof value === 'string' ? value.trim() : '';
  requireValue(!required || text, label + ' is required.');
  return text;
}
export function dateField(value, label) {
  const time = Date.parse(value + 'T00:00:00Z');
  requireValue(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(time) &&
      new Date(time).toISOString().slice(0, 10) === value,
    'Enter a valid ' + label + '.',
  );
  return value;
}
export function choice(value, options, label) {
  requireValue(options.includes(value), 'Select a valid ' + label + '.');
  return value;
}
export function numberField(value, label) {
  requireValue(
    ((typeof value === 'string' && value.trim() !== '') || typeof value === 'number') &&
      Number.isFinite(Number(value)),
    label + ' must be a number.',
  );
  return Number(value);
}
export function percent(value) {
  const result = numberField(value, 'Progress');
  requireValue(
    Number.isInteger(result) && result >= 0 && result <= 100,
    'Progress must be a whole number from 0 to 100.',
  );
  return result;
}
export function identifier(value) {
  const id = Number(value);
  requireValue(Number.isSafeInteger(id) && id > 0, 'Select an existing record.');
  return id;
}
export const roles = ['planner', 'owner', 'head', 'kpi', 'management', 'admin'];
export const statuses = ['Planned', 'In Progress', 'Completed', 'Cancelled'];
