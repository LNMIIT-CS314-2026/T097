import ExcelJS from 'exceljs';
import { one, run, now } from '../repositories.mjs';
import { workspace } from './workspace.mjs';
import { choice, requireValue } from '../validation.mjs';

export function generateReport(actor, kind) {
  choice(kind, ['Strategic plan', 'Initiatives', 'KPIs'], 'report type');
  const data = workspace(actor, {}, { refreshAlerts: false });
  const sections = [];
  if (kind === 'Strategic plan')
    sections.push({
      name: 'Goals',
      columns: ['Goal', 'Status', 'Progress (%)', 'Target date'],
      rows: data.goals.map((g) => [g.title, g.status, g.progress, g.dueDate]),
    });
  if (kind !== 'KPIs')
    sections.push({
      name: 'Initiatives',
      columns: ['Initiative', 'Goal', 'Owner', 'Status', 'Progress (%)', 'Deadline'],
      rows: data.initiatives.map((i) => [
        i.title,
        i.goalTitle,
        i.ownerName,
        i.displayStatus,
        i.progress,
        i.dueDate,
      ]),
    });
  if (kind === 'Strategic plan')
    sections.push({
      name: 'Milestones',
      columns: ['Milestone', 'Initiative', 'Status', 'Progress (%)', 'Due date'],
      rows: data.milestones.map((m) => [
        m.title,
        data.initiatives.find((i) => i.id === m.initiativeId)?.title,
        m.isDelayed ? 'Overdue' : m.status,
        m.progress,
        m.dueDate,
      ]),
    });
  if (kind !== 'Initiatives')
    sections.push({
      name: 'KPIs',
      columns: ['KPI', 'Initiative', 'Current', 'Target', 'Unit', 'Attainment (%)', 'Status'],
      rows: data.kpis.map((k) => [
        k.name,
        k.initiativeTitle,
        k.currentValue,
        k.targetValue,
        k.unit,
        k.progressPct,
        k.status,
      ]),
    });
  const createdAt = now();
  const snapshot = {
    kind,
    createdAt,
    preparedBy: actor.fullName,
    sections,
    unavailable: data.unavailable,
  };
  return Number(
    run(
      'INSERT INTO reports(user_id,role,department,kind,created_at,snapshot) VALUES(?,?,?,?,?,?)',
      actor.id,
      actor.role,
      actor.department,
      kind,
      createdAt,
      JSON.stringify(snapshot),
    ).lastInsertRowid,
  );
}
export function getReport(id, actor) {
  const row = one(
    'SELECT snapshot FROM reports WHERE id=? AND user_id=? AND role=? AND department=?',
    id,
    actor.id,
    actor.role,
    actor.department,
  );
  requireValue(row, 'Report not found.', 404);
  return JSON.parse(row.snapshot);
}
export async function workbook(report) {
  const book = new ExcelJS.Workbook();
  for (const section of report.sections) {
    const sheet = book.addWorksheet(section.name);
    sheet.addRow(section.columns).font = { bold: true };
    for (const row of section.rows) sheet.addRow(row);
    if (report.unavailable.includes(section.name)) sheet.addRow(['Data unavailable']);
    sheet.columns.forEach((column) => {
      column.width = 24;
    });
  }
  return book.xlsx.writeBuffer();
}
