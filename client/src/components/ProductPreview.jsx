import { GmailIcon } from './icons';

// A decorative, non-functional mock of the dashboard, shown on the auth
// pages so visitors can see what the product looks like before signing up.
// Small inline brand marks (not pixel-exact logo reproductions) stand in for
// each company, same spirit as the coloured-initial avatars used elsewhere
// in the real app.
const ROWS = [
  { company: 'Vercel', role: 'Frontend Engineer', status: 'applied', date: 'May 14', logo: 'vercel' },
  { company: 'Linear', role: 'Product Designer', status: 'interviewing', date: 'May 12', logo: 'linear' },
  { company: 'Ramp', role: 'Software Engineer', status: 'offer', date: 'May 10', logo: 'ramp' },
  { company: 'Notion', role: 'Backend Engineer', status: 'rejected', date: 'May 9', logo: 'notion' },
];

const STATS = [
  { key: 'total', label: 'Total', value: 32 },
  { key: 'applied', label: 'Applied', value: 12 },
  { key: 'interviewing', label: 'Interviewing', value: 7 },
  { key: 'offer', label: 'Offers', value: 3 },
];

function CompanyLogo({ variant }) {
  if (variant === 'vercel') {
    return (
      <span className="preview-avatar" style={{ background: '#000' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 22 20H2z" fill="#fff" />
        </svg>
      </span>
    );
  }
  if (variant === 'linear') {
    return (
      <span className="preview-avatar" style={{ background: '#1c1d26' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 17 17 6M4 12 12 4M10 20 20 10"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (variant === 'ramp') {
    return (
      <span className="preview-avatar" style={{ background: '#f7c948' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 18c6-1 10-6 12-14-8 2-13 6-14 12-.3 1.7 0 2 2 2Z"
            fill="#171717"
          />
        </svg>
      </span>
    );
  }
  // notion
  return (
    <span className="preview-avatar" style={{ background: '#111' }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>N</span>
    </span>
  );
}

function ProductPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-header">
        <div>
          <div className="preview-greeting">Good morning, Jordan 👋</div>
          <div className="preview-greeting-sub">You&rsquo;ve got 3 new updates from Gmail.</div>
        </div>
        <span className="preview-gmail-pill">
          <GmailIcon /> Gmail connected <span className="preview-gmail-dot" />
        </span>
      </div>

      <div className="preview-stats">
        {STATS.map((s) => (
          <div key={s.key} className={`preview-stat preview-stat-${s.key}`}>
            <small>{s.label}</small>
            <b>{s.value}</b>
            <svg className="preview-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="0,14 12,10 24,13 36,5 48,8 60,2" />
            </svg>
          </div>
        ))}
      </div>

      <div className="preview-list-head">Recent applications</div>
      <ul className="preview-list">
        {ROWS.map((r) => (
          <li key={r.company} className="preview-row">
            <CompanyLogo variant={r.logo} />
            <span className="preview-co">
              <b>{r.company}</b>
              <small>{r.role}</small>
            </span>
            <span className={`preview-pill status-${r.status}`}>{r.status}</span>
            <span className="preview-date">{r.date}</span>
          </li>
        ))}
      </ul>

      <div className="preview-footer">
        <span className="preview-view-all">
          View all applications
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10h12M11 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default ProductPreview;
