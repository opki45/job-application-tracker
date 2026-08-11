import { useState, useLayoutEffect, useRef } from 'react';
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

  // The sliding pill behind the active tab: measured from the actual tab
  // elements (not a CSS percentage guess) so it's exact regardless of the
  // container's padding/gap, and re-measured on route change and resize.
  const loginTabRef = useRef(null);
  const registerTabRef = useRef(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = isLogin ? loginTabRef.current : registerTabRef.current;
    if (!el) return;
    const measure = () => setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isLogin]);

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
          {/* hero-left-content matters, not just cosmetic: badge/headline/
              subtitle/tabs/form each have different natural widths, so
              centering them independently (the previous approach) gave each
              a different left edge -- the badge (short) centered with a big
              offset, the headline (long) with a small one, so nothing lined
              up. This wrapper gives them one shared width to left-align
              within, and only THAT single box gets centered in the panel. */}
          <div className="hero-left-content">
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
              <div
                className="auth-tabs-thumb"
                style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
              />
              <Link ref={loginTabRef} to="/login" className={`auth-tab${isLogin ? ' active' : ''}`}>
                Log in
              </Link>
              <Link ref={registerTabRef} to="/register" className={`auth-tab${isLogin ? '' : ' active'}`}>
                Create account
              </Link>
            </div>

            <div className="hero-form">{children}</div>
          </div>
        </div>
        <div className="hero-right">
          <ProductPreview />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
