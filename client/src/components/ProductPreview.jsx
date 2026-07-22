// A decorative, non-functional mock of the dashboard, shown on the landing page
// so visitors can see what the product looks like before signing up.
const ROWS = [
  { company: 'Monzo', role: 'Graduate Engineer', status: 'offer' },
  { company: 'Google', role: 'SWE Intern', status: 'interviewing' },
  { company: 'Stripe', role: 'Backend Engineer', status: 'applied' },
  { company: 'Wayve', role: 'ML Engineer', status: 'applied' },
];

function ProductPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-bar">
        <span />
        <span />
        <span />
      </div>
      <div className="preview-body">
        <div className="preview-stats">
          <div className="preview-stat">
            <b>12</b>
            <small>Total</small>
          </div>
          <div className="preview-stat">
            <b>3</b>
            <small>Interviewing</small>
          </div>
          <div className="preview-stat">
            <b>1</b>
            <small>Offer</small>
          </div>
        </div>
        <ul className="preview-list">
          {ROWS.map((r) => (
            <li key={r.company} className={`preview-row row-${r.status}`}>
              <span className="preview-avatar">{r.company.charAt(0)}</span>
              <span className="preview-co">
                <b>{r.company}</b>
                <small>{r.role}</small>
              </span>
              <span className={`preview-pill status-${r.status}`}>{r.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProductPreview;
