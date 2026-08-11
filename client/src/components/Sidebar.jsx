import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

// Now a persistent part of AppShell (a layout route, mounted once) rather
// than something every page re-mounts with its own activeNav/hasActivity
// props -- so both are derived here instead of being handed down. activeNav
// comes from the current URL (review-queue is excluded from the match: it's
// a secondary link to '/', not its own route, and was never highlighted
// even when this was a prop). hasActivity -- whether to show the "Upgrade to
// Pro" nudge vs. the theme toggle -- used to come only from Dashboard's own
// fetch; now it's a real (if minimal) fetch of its own, same pattern as the
// review-queue badge count already used.
function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeNav = NAV_ITEMS.find(
    (item) => item.key !== 'review-queue' && item.to === location.pathname
  )?.key;

  // React Router's own `viewTransition` prop on <Link> is built for its data
  // router (createBrowserRouter + RouterProvider); this app uses the plain
  // declarative <BrowserRouter>/<Routes>, where it silently never calls
  // document.startViewTransition at all (confirmed by instrumenting it --
  // zero calls on navigation). Driving the View Transitions API by hand
  // instead: flushSync forces the navigate()-triggered re-render to commit
  // synchronously *inside* startViewTransition's callback, which is what the
  // API needs to capture an old/new DOM snapshot pair to animate between.
  function handleNavClick(e, to) {
    if (!document.startViewTransition) return; // let the plain <Link> navigate normally
    e.preventDefault();
    document.startViewTransition(() => {
      flushSync(() => navigate(to));
    });
  }

  const [reviewQueueCount, setReviewQueueCount] = useState(0);
  const [hasActivity, setHasActivity] = useState(true);
  // Purely a visual toggle (icon/label) -- there's no dark theme built yet,
  // so this doesn't switch a real theme. It's here because the reference
  // shows it as a persistent sidebar element.
  const [light, setLight] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/applications'), api.get('/candidates')])
      .then(([appsData, candidatesData]) => {
        if (cancelled) return;
        setReviewQueueCount(candidatesData.candidates.length);
        setHasActivity(appsData.applications.length > 0 || candidatesData.candidates.length > 0);
      })
      .catch(() => {
        // Non-critical: worst case the badge/footer just use their defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon: Icon, to, showBadge }) => (
          <Link
            key={key}
            to={to}
            onClick={(e) => handleNavClick(e, to)}
            className={`sidebar-item${activeNav === key ? ' active' : ''}`}
          >
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
