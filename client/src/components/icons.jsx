// Small inline SVG icons used across the auth screens. Inline rather than an
// icon-library dependency, consistent with the rest of the app (Logo.jsx is
// already a hand-drawn inline SVG) -- no extra install, no external requests.

export function MailIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.5 5.5l6.5 5 6.5-5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 2.5l15 15M8.3 8.4a2.5 2.5 0 0 0 3.4 3.4M6 5.1C7.1 4.6 8.4 4.3 10 4.3c5.5 0 8.5 6 8.5 6-.6 1.2-1.5 2.5-2.7 3.6M4.2 6.6C2.6 7.9 1.5 9.6 1.5 9.6s3 6 8.5 6c1.1 0 2.1-.2 3-.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.61Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.69A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.69V4.98H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.02l3.05-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.98l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

// A simplified Gmail glyph (not a pixel-exact trademark reproduction) --
// enough to read as "Gmail" in a small connection-status pill.
export function GmailIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 16" aria-hidden="true" {...props}>
      <rect x="0.5" y="0.5" width="19" height="15" rx="2" fill="#fff" stroke="#e6e8ef" />
      <path d="M1 2.2 10 9l9-6.8" fill="none" stroke="#EA4335" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1 2v11.5c0 .3.2.5.5.5H4V4.3z" fill="#4285F4" />
      <path d="M19 2v11.5c0 .3-.2.5-.5.5H16V4.3z" fill="#34A853" />
      <path d="M4 4.3 10 9l6-4.7V2L10 7.5 4 2z" fill="#FBBC05" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Sidebar nav icons
   ------------------------------------------------------------------------- */
export function HomeIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 9.5 10 3l7 6.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1V9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BriefcaseIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2.5" y="6.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 6.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M2.5 11h15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 10.5 5 4h10l2.5 6.5M2.5 10.5V15a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4.5M2.5 10.5h4.2a2 2 0 0 1 1.9 1.3.9.9 0 0 0 .9.7h1a.9.9 0 0 0 .9-.7 2 2 0 0 1 1.9-1.3h4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BarChartIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 16.5V11M10 16.5V3.5M16 16.5V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 8a5 5 0 0 1 10 0c0 3.5 1.2 4.7 1.2 4.7H3.8S5 11.5 5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.2 15.5a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.4 4.6l-1.4 1.4M6 12.6l-1.4 1.4M15.4 15.4l-1.4-1.4M6 7.4 4.6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.4 4.6l-1.4 1.4M6 12.6l-1.4 1.4M15.4 15.4l-1.4-1.4M6 7.4 4.6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrendingUpIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 14 8 9l3 3 6-6.5M13 6h4v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Stat card icons
   ------------------------------------------------------------------------- */
export function FolderIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PaperPlaneIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M17.5 2.5 2.5 8.8l5.7 2.2 2 5.8L17.5 2.5ZM8.2 11l4-4.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PeopleIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 12.3c1.9.2 3.5 1.5 3.5 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BadgeCheckIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 2.5 12 4l2.6-.3 1 2.4 2.2 1.3-.6 2.6.6 2.6-2.2 1.3-1 2.4L12 16l-2 1.5-2-1.5-2.6.3-1-2.4-2.2-1.3.6-2.6-.6-2.6L4.4 6l1-2.4L8 4l2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M7.3 10.2l1.9 1.9 3.5-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Misc UI icons
   ------------------------------------------------------------------------- */
export function ChevronDownIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserCircleIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 16c.8-2.3 2.9-3.5 5.5-3.5s4.7 1.2 5.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8M13 13.5 17 10l-4-3.5M17 10H7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EnvelopeOpenIcon(props) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 16 20 6l15 10v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 16l15 9 15-9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderOpenIcon(props) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 13a2 2 0 0 1 2-2h6l3 3h13a2 2 0 0 1 2 2l-2.5 12.5a2 2 0 0 1-2 1.5H8a2 2 0 0 1-2-1.6L5 13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DotsHorizontalIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="4" cy="10" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="16" cy="10" r="1.6" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6 6l.6 9.4a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L14 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10.5 8 15l8-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoteIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 4.5a1.5 1.5 0 0 1 1.5-1.5h9L17 6.5V15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M13.2 3v3.2a.8.8 0 0 0 .8.8H17" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
