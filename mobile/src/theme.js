// Mirrors the CSS custom properties in client/src/index.css's :root block
// and the status palette from designs/app-ui-design.png.png, so the mobile
// app reads as the same product, not a reskin.
export const colors = {
  bg: '#f8f7fc',
  surface: '#ffffff',
  border: '#e6e8ef',
  text: '#171a22',
  muted: '#6b7280',
  faint: '#9aa1ad',
  primary: '#5b53e0',
  primaryHover: '#4c45c9',
  danger: '#e5484d',
  success: '#16a34a',
  brandTint: '#f2f0ff',
  brandTintBorder: '#d9d5fb',

  // Status palette -- same hex values used everywhere on the web (stat
  // cards, pills, row tints), validated colorblind-safe via the dataviz
  // skill's script.
  status: {
    applied: '#3b82f6',
    interviewing: '#f59e0b',
    offer: '#10b981',
    rejected: '#ef4444',
    accepted: '#8b5cf6',
  },
};

export const statusTint = {
  applied: '#eff6ff',
  interviewing: '#fffbeb',
  offer: '#ecfdf5',
  rejected: '#fef2f2',
  accepted: '#f5f3ff',
};

export const radius = { sm: 9, md: 14, lg: 20, pill: 999 };

export const spacing = (n) => n * 4;
