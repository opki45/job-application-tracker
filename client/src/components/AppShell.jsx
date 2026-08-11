import { Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { GmailProvider } from '../GmailContext';
import Logo from './Logo';
import GmailConnect from './GmailConnect';
import Sidebar from './Sidebar';
import { UserCircleIcon, ChevronDownIcon, LogoutIcon } from './icons';

// A layout route (App.jsx wraps every authenticated page route as a child of
// <Route element={<AppShell />}>), NOT a per-page wrapper anymore -- it used
// to take `children`/`activeNav`/`hasActivity` props and every page called
// it individually, which meant the topbar/sidebar/GmailProvider fully
// unmounted and remounted (re-fetching Gmail status, the review-queue
// badge count) on every single navigation. As a layout route this mounts
// once; only <Outlet /> -- the page content -- swaps when the route changes.
// Sidebar no longer takes activeNav/hasActivity as props for the same
// reason: it derives both itself now (see Sidebar.jsx).
function AppShell() {
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
          <Sidebar />
          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </GmailProvider>
  );
}

export default AppShell;
