import { useState } from 'react';
import RecordForm from '../components/RecordForm.jsx';
import DataTable from '../components/DataTable.jsx';
import { roleNames, labels } from '../components/Sidebar.jsx';

function definition(page, data) {
  const role = data.actor.role;
  const open = (data.initiatives || []).filter((i) => !['Completed', 'Cancelled'].includes(i.status));
  const parents = (rows) => rows.map((i) => [i.id, i.title]);
  const parent = { name: 'initiativeId', label: 'Initiative', options: parents(open) };
  const title = { name: 'title', label: 'Title' },
    description = { name: 'description', label: 'Description', type: 'textarea', required: false };
  const current = {
    name: 'currentValue',
    label: 'Current value',
    type: 'number',
    step: 'any',
    required: false,
  };
  function parentTitle(row) {
    return data.initiatives.find((i) => i.id === row.initiativeId)?.title || 'Awaiting assignment';
  }
  switch (page) {
    case 'goals':
      return {
        item: 'goal',
        canAdd: role === 'planner',
        canEdit: (g) => role === 'planner' && g.review !== 'Under Review',
        defaults: { status: 'Active' },
        fields: [
          title,
          description,
          { name: 'startDate', label: 'Start date', type: 'date' },
          { name: 'dueDate', label: 'End date', type: 'date' },
          { name: 'status', label: 'Goal status', options: ['Active', 'Inactive', 'Completed'] },
        ],
        columns: ['Goal', 'End date', 'Status', 'Review', 'Progress'],
        cells: (g) => [
          g.title,
          g.dueDate,
          g.status,
          g.review,
          g.progress === null ? '—' : g.progress + '%',
        ],
      };
    case 'milestones':
      return {
        item: 'milestone',
        canAdd: ['owner', 'planner'].includes(role) && open.length > 0,
        canEdit: (m) => ['owner', 'planner'].includes(role) && open.some((i) => i.id === m.initiativeId),
        defaults: { required: true, progress: 0, status: 'Not Started' },
        fields: [
          parent,
          title,
          description,
          { name: 'dueDate', label: 'Due date', type: 'date' },
          { name: 'progress', label: 'Completion (%)', type: 'number', min: 0, max: 100 },
          { name: 'status', label: 'Status', options: ['Not Started', 'In Progress', 'Completed'] },
          { name: 'required', label: 'Required for initiative completion', type: 'checkbox' },
        ],
        columns: ['Milestone', 'Initiative', 'Due', 'Completion', 'Status', 'Required'],
        cells: (m) => [
          m.title,
          parentTitle(m),
          m.dueDate,
          m.progress + '%',
          m.isDelayed ? 'Overdue' : m.status,
          m.required ? 'Yes' : 'No',
        ],
      };
    case 'kpis':
      return {
        item: 'KPI',
        canAdd: ['planner', 'kpi'].includes(role) && data.initiatives.length > 0,
        canEdit: () => ['planner', 'owner', 'kpi'].includes(role),
        defaults: {},
        fields:
          role === 'owner'
            ? [current]
            : [
                { ...parent, options: parents(data.initiatives) },
                { name: 'name', label: 'KPI name' },
                description,
                {
                  name: 'targetValue',
                  label: 'Target value',
                  type: 'number',
                  step: 'any',
                  required: false,
                },
                current,
                { name: 'unit', label: 'Unit' },
                {
                  name: 'threshold',
                  label: 'Warning threshold (optional)',
                  type: 'number',
                  step: 'any',
                  required: false,
                },
              ],
        columns: ['KPI', 'Initiative', 'Current', 'Target', 'Unit', 'Attainment', 'Status'],
        cells: (k) => [
          k.name,
          parentTitle(k),
          k.currentValue,
          k.targetValue,
          k.unit,
          k.progressPct === null ? '—' : k.progressPct + '%',
          k.status,
        ],
      };
    case 'risks':
      return {
        item: 'risk',
        canAdd: open.length > 0,
        canEdit: (r) => open.some((i) => i.id === r.initiativeId),
        defaults: { status: 'Open' },
        fields: [
          parent,
          title,
          { name: 'mitigation', label: 'Mitigation', type: 'textarea', required: false },
          { name: 'status', label: 'Status', options: ['Open', 'Resolved'] },
        ],
        columns: ['Risk', 'Initiative', 'Mitigation', 'Status'],
        cells: (r) => [r.title, parentTitle(r), r.mitigation, r.status],
      };
    case 'users':
      return {
        item: 'account',
        canAdd: true,
        canEdit: () => true,
        defaults: { active: true },
        fields: [
          { name: 'fullName', label: 'Full name' },
          { name: 'username', label: 'Username' },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            minLength: 10,
            autoComplete: 'new-password',
          },
          { name: 'role', label: 'Role', options: Object.entries(roleNames) },
          { name: 'department', label: 'Department', options: data.departments.map((d) => d.name) },
          { name: 'active', label: 'Active account', type: 'checkbox' },
        ],
        columns: ['Name', 'Username', 'Role', 'Department', 'Status'],
        cells: (u) => [
          u.fullName,
          u.username,
          roleNames[u.role],
          u.department,
          u.active ? 'Active' : 'Inactive',
        ],
      };
    case 'departments':
      return {
        item: 'department',
        canAdd: true,
        canEdit: () => true,
        defaults: {},
        fields: [{ name: 'name', label: 'Department name' }],
        columns: ['Department'],
        cells: (d) => [d.name],
      };
  }
}

export default function RecordsPage({ page, data, onSave, onGoal }) {
  const config = definition(page, data);
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing);
  const fields = config.fields.map((f) => {
    if (isEdit && f.name === 'password')
      return { ...f, label: 'New password (leave blank to keep)', required: false };
    if (
      isEdit &&
      page === 'milestones' &&
      f.name === 'status' &&
      (editing.status === 'Cancelled' || (editing.isDelayed && editing.status === 'In Progress'))
    )
      return { ...f, options: [...f.options, 'Cancelled'] };
    if (isEdit && f.name === 'initiativeId' && ['milestones', 'risks'].includes(page))
      return { ...f, disabled: true };
    return f;
  });
  async function submit(b) {
    const department = page === 'departments';
    return onSave(
      '/' + page + (isEdit && !department ? '/' + editing.id : ''),
      isEdit && !department ? 'PATCH' : 'POST',
      department ? { name: b.name, previous: editing?.name } : b,
    );
  }
  async function review(g) {
    try {
      await onSave('/goals/' + g.id + '/submit', 'POST', {});
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }
  const rows = data[page].map((row) => {
    const cells = config.cells(row);
    if (page === 'goals')
      cells[0] = (
        <button className="table-title-button" onClick={() => onGoal(row)}>
          {row.title}
        </button>
      );
    return [
      ...cells,
      <div className="row-actions">
        {config.canEdit(row) && (
          <button className="text-button" onClick={() => setEditing(row)}>
            Edit
          </button>
        )}
        {page === 'goals' &&
          data.actor.role === 'planner' &&
          ['Draft', 'Revision Required'].includes(row.review) && (
            <button className="text-button" onClick={() => review(row)}>
              Submit for review
            </button>
          )}
      </div>,
    ];
  });
  return (
    <div className="page-content">
      <div className="page-intro-row">
        <h1>{labels[page]}</h1>
        {config.canAdd && (
          <button className="button primary" onClick={() => setEditing(null)}>
            New {config.item}
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <DataTable
          columns={[...config.columns, '']}
          rows={rows}
          empty={
            data.unavailable?.includes({ kpis: 'KPIs', milestones: 'Milestones' }[page])
              ? 'Data unavailable.'
              : 'No records available.'
          }
        />
      </section>
      {editing !== undefined && (
        <RecordForm
          title={(isEdit ? 'Edit ' : 'Create ') + config.item}
          fields={fields}
          initial={editing || config.defaults}
          onClose={() => setEditing(undefined)}
          onSave={submit}
        />
      )}
    </div>
  );
}
