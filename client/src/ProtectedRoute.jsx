import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Wraps any page that requires login. If there's no user, it redirects to
// /login instead of rendering the page.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking localStorage on startup — don't decide yet.
  if (loading) {
    return <p>Loading...</p>;
  }

  // Not logged in -> bounce to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in -> render the protected page.
  return children;
}

export default ProtectedRoute;
