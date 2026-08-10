import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import ProductPreview from './ProductPreview';

// The landing-page shell shared by Login and Register: a top nav, a divider,
// then a two-column hero -- badge/headline/tab-switcher/form on the left,
// a product preview on the right, on a soft gradient that deepens toward
// the bottom-right corner. Each page passes its headline (split into a
// plain part and an accented part, matching the reference design), subtitle,
// form (as children), and the nav call-to-action for the other page.
function AuthLayout({ title, titleAccent, subtitle, navPrompt, navTo, navLabel, children }) {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="landing-nav-right">
          <span>{navPrompt}</span>
          <Link className="nav-link" to={navTo}>
            {navLabel}
          </Link>
        </div>
      </nav>
      <div className="landing-nav-divider" />

      <div className="landing-hero">
        <div className="hero-left">
          <span className="auth-badge">Track. Organize. Get hired.</span>
          <h1 className="hero-title">
            {title}
            {titleAccent && (
              <>
                <br />
                <span className="hero-title-accent">{titleAccent}</span>
              </>
            )}
          </h1>
          <p className="hero-sub">{subtitle}</p>

          <div className="auth-tabs">
            <Link to="/login" className={`auth-tab${isLogin ? ' active' : ''}`}>
              Log in
            </Link>
            <Link to="/register" className={`auth-tab${isLogin ? '' : ' active'}`}>
              Create account
            </Link>
          </div>

          <div className="hero-form">{children}</div>
        </div>
        <div className="hero-right">
          <ProductPreview />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
