// The brand mark: a gradient rounded square with a briefcase glyph, plus the
// "Applied" wordmark. `light` switches the wordmark to white for dark panels.
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
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="10" y="16" width="20" height="13" rx="2.5" />
          <path d="M16 16v-1.5a2.5 2.5 0 0 1 2.5-2.5h3a2.5 2.5 0 0 1 2.5 2.5V16" />
          <path d="M10 21h20" />
        </g>
      </svg>
      {showText && <span className="logo-text">Landed</span>}
    </div>
  );
}

export default Logo;
