import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ApplicationsPage from './pages/ApplicationsPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RemindersPage from './pages/RemindersPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './ProtectedRoute';
import AppShell from './components/AppShell';

// ProtectedRoute and AppShell are both layout routes now (each renders an
// <Outlet /> for its children), not per-page wrappers -- so they mount ONCE
// and persist across every navigation between the pages nested under them,
// instead of the topbar/sidebar/GmailProvider fully unmounting and
// remounting (and Gmail status / the review-queue count re-fetching) on
// every single page change. Only the innermost matched page swaps.
function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected: ProtectedRoute sends you to /login if you're not logged
          in; AppShell renders the persistent topbar+sidebar shell around
          whichever page below matched. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Any unknown URL -> send to the dashboard route. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
