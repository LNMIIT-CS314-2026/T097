import RecordForm from './RecordForm.jsx';
export default function InitiativeForm({ initiative, goals, owners, onClose, onSave }) {
  const fields = [
    { name: 'title', label: 'Initiative title', maxLength: 140 },
    { name: 'description', label: 'Description', type: 'textarea', required: false },
    {
      name: 'goalId',
      label: 'Strategic goal',
      options: goals
        .filter((g) => g.status === 'Active' || initiative?.goalId === g.id)
        .map((g) => [g.id, g.title]),
    },
    {
      name: 'ownerId',
      label: 'Initiative owner',
      required: Boolean(initiative && initiative.status !== 'Planned'),
      options: owners.map((o) => [o.id, o.fullName]),
    },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'dueDate', label: 'Target date', type: 'date' },
  ];
  return (
    <RecordForm
      title={initiative ? 'Edit initiative' : 'Create initiative'}
      fields={fields}
      initial={initiative || {}}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
