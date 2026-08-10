import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, to: '/' },
  { key: 'applications', label: 'Applications', icon: BriefcaseIcon, to: '/applications' },
  { key: 'review-queue', label: 'Review queue', icon: InboxIcon, to: '/', showBadge: true },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon, to: '/calendar' },
  { key: 'analytics', label: 'Analytics', icon: BarChartIcon, to: '/analytics' },
  { key: 'reminders', label: 'Reminders', icon: BellIcon, to: '/reminders' },
  { key: 'settings', label: 'Settings', icon: GearIcon, to: '/settings' },
];

// activeNav names which item is highlighted (e.g. "applications" on the
// Applications page). hasActivity switches the footer between the theme
// toggle (a brand-new, empty-state user) and the "Upgrade to Pro" nudge --
// defaults to true since every page other than a freshly-loaded Dashboard
// doesn't have a cheap way to know if the user has any applications yet,
// and "assume there's data" is the safer default once you've navigated
// somewhere other than the empty-state's own page.
function Sidebar({ activeNav = 'dashboard', hasActivity = true }) {
  const [reviewQueueCount, setReviewQueueCount] = useState(0);
  // Purely a visual toggle (icon/label) -- there's no dark theme built yet,
  // so this doesn't switch a real theme. It's here because the reference
  // shows it as a persistent sidebar element.
  const [light, setLight] = useState(true);

  // The badge needs to be accurate from every page, not just Dashboard (which
  // already has this count from its own candidates fetch) -- so Sidebar
  // fetches it independently rather than requiring every page to plumb it
  // down as a prop.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/candidates')
      .then((data) => {
        if (!cancelled) setReviewQueueCount(data.candidates.length);
      })
      .catch(() => {
        // Non-critical: worst case the badge just doesn't show a count.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon: Icon, to, showBadge }) => (
          <Link key={key} to={to} className={`sidebar-item${activeNav === key ? ' active' : ''}`}>
            <Icon />
            <span>{label}</span>
            {showBadge && reviewQueueCount > 0 && (
              <span className="sidebar-badge">{reviewQueueCount}</span>
            )}
          </Link>
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
