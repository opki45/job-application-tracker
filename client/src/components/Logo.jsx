// The brand mark: a gradient rounded square with an up-and-to-the-right
// arrow glyph (the "Landed"/trending-up idea), plus the wordmark. `light`
// switches the wordmark to white for dark panels.
function Logo({ showText = true, light = false }) {
  return (
    <div className={`logo${light ? ' logo--light' : ''}`}>
      <svg
        className="logo-mark"
        viewBox="0 0 40 40"
        width="34"
        height="34"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx="11" fill="url(#logoGrad)" />
        <g fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 28 28 12" />
          <path d="M17 12h11v11" />
        </g>
      </svg>
      {showText && <span className="logo-text">Landed</span>}
    </div>
  );
}

export default Logo;
