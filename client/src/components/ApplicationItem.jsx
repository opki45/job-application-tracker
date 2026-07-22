const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// One row in the list. It receives the application to show (`app`) and two
// callbacks from its parent: one to change status, one to delete. The item
// itself holds no state — it just displays data and reports user actions upward.
function ApplicationItem({ app, onStatusChange, onDelete }) {
  return (
    <li style={{ margin: '0.5rem 0' }}>
      <strong>{app.company}</strong> — {app.role}{' '}

      {/* Changing this dropdown calls back up to the parent with the new status. */}
      <select
        value={app.status}
        onChange={(e) => onStatusChange(app.id, e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>{' '}

      <span>applied {app.date_applied}</span>{' '}

      <button onClick={() => onDelete(app.id)}>Delete</button>
    </li>
  );
}

export default ApplicationItem;
