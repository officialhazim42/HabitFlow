/**
 * HabitFlow — Theme and Appearance Controller
 * Supports: Dark Mode, Light Mode, System Theme
 * 6 Accent Presets: Emerald, Teal, Blue, Purple, Amber, Rose
 * Persists in localStorage and synchronizes with user profile.
 */

export const ACCENTS = {
  emerald: { primary: '#9BE15D', secondary: '#63D6BD', name: 'Emerald' },
  teal:    { primary: '#63D6BD', secondary: '#9BE15D', name: 'Teal' },
  blue:    { primary: '#38BDF8', secondary: '#818CF8', name: 'Ocean Blue' },
  purple:  { primary: '#A78BFA', secondary: '#F472B6', name: 'Indigo / Violet' },
  amber:   { primary: '#FBBF24', secondary: '#F87171', name: 'Amber Gold' },
  rose:    { primary: '#FB7185', secondary: '#F43F5E', name: 'Rose Crimson' }
};

export function getStoredTheme() {
  const saved = localStorage.getItem('habitflow_theme');
  if (saved && ['dark', 'light', 'system'].includes(saved)) {
    return saved;
  }
  return 'dark'; // HabitFlow default dark
}

export function getStoredAccent() {
  const saved = localStorage.getItem('habitflow_accent');
  if (saved && ACCENTS[saved]) {
    return saved;
  }
  return 'emerald'; // HabitFlow default accent
}

export function applyTheme(themeName, accentName) {
  const theme = themeName || getStoredTheme();
  const accent = accentName || getStoredAccent();

  let effectiveTheme = theme;
  if (theme === 'system') {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    effectiveTheme = prefersLight ? 'light' : 'dark';
  }

  const root = document.documentElement;
  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-accent', accent);
  root.style.colorScheme = effectiveTheme;

  // Apply accent colors dynamically
  if (ACCENTS[accent]) {
    root.style.setProperty('--accent-primary', ACCENTS[accent].primary);
    root.style.setProperty('--accent-secondary', ACCENTS[accent].secondary);
    root.style.setProperty('--border-focus', ACCENTS[accent].primary);
  }
}

export function setTheme(themeName) {
  if (['dark', 'light', 'system'].includes(themeName)) {
    localStorage.setItem('habitflow_theme', themeName);
    applyTheme(themeName, getStoredAccent());
  }
}

export function setAccent(accentName) {
  if (ACCENTS[accentName]) {
    localStorage.setItem('habitflow_accent', accentName);
    applyTheme(getStoredTheme(), accentName);
  }
}

// Initialize theme immediately
applyTheme();

// Listen to system theme preference changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system', getStoredAccent());
    }
  });
}
