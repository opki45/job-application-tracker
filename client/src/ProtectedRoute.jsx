import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// A layout route (mounted once via App.jsx's <Route element={<ProtectedRoute />}>
// wrapping every authenticated route as children) rather than a per-page
// wrapper. Used to render <children> directly and get re-mounted fresh on
// every navigation along with whatever it wrapped -- which, combined with
// AppShell being wrapped the same way, was the root cause of the topbar/
// sidebar flickering and re-fetching (Gmail status, review-queue count) on
// every single page change. As a layout route it mounts once and its
// <Outlet /> is all that swaps.
function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Still checking localStorage on startup — don't decide yet.
  if (loading) {
    return <p>Loading...</p>;
  }

  // Not logged in -> bounce to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in -> render whichever nested route matched.
  return <Outlet />;
}

export default ProtectedRoute;
