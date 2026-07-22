import { Link } from 'react-router-dom';
import Logo from './Logo';
import ProductPreview from './ProductPreview';

// The landing-page shell shared by Login and Register: a top nav, a hero with
// headline + form on the left and a product preview on the right, on a soft
// gradient. Each page passes its headline, subtitle, form (as children), and
// the nav call-to-action for the other page.
function AuthLayout({ title, subtitle, navPrompt, navTo, navLabel, children }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="landing-nav-right">
          <span>{navPrompt}</span>
          <Link className="nav-btn" to={navTo}>
            {navLabel}
          </Link>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="hero-left">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-sub">{subtitle}</p>
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
