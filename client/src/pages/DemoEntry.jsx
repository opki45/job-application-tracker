import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Reached two ways: the "View Demo" link in AuthLayout's nav (shown on both
// Login and Register), or a direct URL someone links straight from a CV/
// LinkedIn profile. Either way, this page has one job -- log the visitor
// into the shared demo account and get out of the way. See AuthContext's
// loginAsDemo() and authController.js's demoLogin for what actually happens
// server-side (a fresh reseed on every single visit).
function DemoEntry() {
  const { loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    loginAsDemo()
      .then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="demo-entry-status">
        <p className="error">Couldn't load the demo: {error}</p>
        <Link className="nav-link" to="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return <div className="demo-entry-status">Loading the demo…</div>;
}

export default DemoEntry;
