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

// Wraps a page element in ProtectedRoute so I don't repeat the same
// three lines for every authenticated route below.
function protect(element) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected: ProtectedRoute sends you to /login if you're not logged in. */}
      <Route path="/" element={protect(<Dashboard />)} />
      <Route path="/applications" element={protect(<ApplicationsPage />)} />
      <Route path="/calendar" element={protect(<CalendarPage />)} />
      <Route path="/analytics" element={protect(<AnalyticsPage />)} />
      <Route path="/reminders" element={protect(<RemindersPage />)} />
      <Route path="/settings" element={protect(<SettingsPage />)} />

      {/* Any unknown URL -> send to the dashboard route. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
