import { useAuth } from '../AuthContext';
import { GmailProvider } from '../GmailContext';
import Logo from './Logo';
import GmailConnect from './GmailConnect';
import Sidebar from './Sidebar';
import { UserCircleIcon, ChevronDownIcon, LogoutIcon } from './icons';

// The shell every authenticated page sits inside: topbar (logo, Gmail
// status, user menu, logout) + sidebar (nav) + a main content area for
// whatever the page renders. Pulled out of Dashboard.jsx once there was
// more than one page that needed it.
//
// Wraps its content in GmailProvider so any page (and anything it renders,
// like the review queue) can read/set Gmail connection status via
// useGmail() without each page re-fetching it independently.
function AppShell({ activeNav, hasActivity, children }) {
  const { user, logout } = useAuth();

  return (
    <GmailProvider>
      <div>
        <header className="topbar">
          <Logo />
          <div className="topbar-right">
            <GmailConnect />
            <div className="topbar-user">
              <UserCircleIcon />
              {user.email}
              <ChevronDownIcon />
            </div>
            <button className="btn-logout" onClick={logout}>
              <LogoutIcon /> Logout
            </button>
          </div>
        </header>

        <div className="app-body">
          <Sidebar activeNav={activeNav} hasActivity={hasActivity} />
          <main className="main-content">{children}</main>
        </div>
      </div>
    </GmailProvider>
  );
}

export default AppShell;
