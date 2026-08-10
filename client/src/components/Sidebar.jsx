import { useState } from 'react';
import {
  HomeIcon,
  BriefcaseIcon,
  InboxIcon,
  CalendarIcon,
  BarChartIcon,
  BellIcon,
  GearIcon,
  SunIcon,
  TrendingUpIcon,
} from './icons';

// Only "Dashboard" is a real page right now -- the rest are shown so the
// nav matches the reference design's shape, but they're decorative (no
// route, not clickable) rather than dead links to pages that don't exist.
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, active: true },
  { key: 'applications', label: 'Applications', icon: BriefcaseIcon },
  { key: 'review-queue', label: 'Review queue', icon: InboxIcon, showBadge: true },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'analytics', label: 'Analytics', icon: BarChartIcon },
  { key: 'reminders', label: 'Reminders', icon: BellIcon },
  { key: 'settings', label: 'Settings', icon: GearIcon },
];

// hasActivity switches the sidebar footer between the theme toggle (a
// brand-new, empty-state user) and the "Upgrade to Pro" nudge (a user who
// actually has data to export/analyze) -- matching designs/home-page-empty
// vs designs/home-page-filled, which show one or the other, never both.
function Sidebar({ reviewQueueCount = 0, hasActivity = false }) {
  // Purely a visual toggle (icon/label) -- there's no dark theme built yet,
  // so this doesn't switch a real theme. It's here because the reference
  // shows it as a persistent sidebar element.
  const [light, setLight] = useState(true);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon: Icon, active, showBadge }) => (
          <div key={key} className={`sidebar-item${active ? ' active' : ''}`}>
            <Icon />
            <span>{label}</span>
            {showBadge && reviewQueueCount > 0 && (
              <span className="sidebar-badge">{reviewQueueCount}</span>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {hasActivity ? (
          <div className="upgrade-card">
            <span className="upgrade-icon">
              <TrendingUpIcon />
            </span>
            <div className="upgrade-title">Unlock more insights</div>
            <div className="upgrade-sub">Export data, advanced analytics, and more.</div>
            <button type="button" className="btn-primary btn-upgrade">
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <button type="button" className="theme-toggle" onClick={() => setLight((v) => !v)}>
            <SunIcon /> {light ? 'Light mode' : 'Dark mode'}
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
