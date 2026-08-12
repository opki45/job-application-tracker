import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Same shape as AuthContext/GmailContext: one provider, one hook, one
// source of truth -- Sidebar's quick toggle and SettingsPage's Light/Dark/
// System picker both read and write this instead of each keeping their own
// (previously decorative, non-functional) local state.
//
// theme is the user's actual CHOICE: 'light' | 'dark' | 'system'. resolved
// is what's actually showing right now ('light' | 'dark') -- with 'system'
// it tracks the OS/browser preference live, so a toggle that flips "the
// opposite of what's currently showing" (Sidebar's) does the right thing
// even when the current state came from the OS setting, not an explicit
// choice.
const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme'; // unprefixed, like AuthContext's 'token'/'user' -- localStorage is already origin-scoped

function getSystemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  // Track OS/browser preference live, in case it's showing (theme === 'system')
  // and the user changes it without reloading the page.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemPrefersDark(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  // Apply by setting data-theme on <html> -- index.css's dark-mode block
  // reads this attribute (an explicit choice always wins) alongside
  // prefers-color-scheme (for 'system', where no attribute is set at all
  // and the media query alone decides).
  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = { theme, resolved, setTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
