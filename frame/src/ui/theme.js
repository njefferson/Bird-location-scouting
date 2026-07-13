// =============================================================================
// Dawn Mode — shared theme state + a floating moon/sun toggle available on
// every screen. The <head> boot script applies the stored theme before first
// paint; this keeps localStorage, the browser theme-color, the floating button
// and the Settings checkbox all in step.
// =============================================================================
import { el } from './dom.js';

const KEY = 'frame.theme';

// Line icons in the same family as the tab bar (stroke = currentColor, 18px).
const MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></svg>`;

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function isDark() { return currentTheme() === 'dark'; }

// The single place that flips the theme: sets [data-theme], persists the
// choice, syncs the browser chrome colour, and updates every on-screen control.
export function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#141210' : '#ebe1cf');
  syncControls();
}

export function toggleTheme() { setTheme(!isDark()); }

let btn = null;
function syncControls() {
  const dark = isDark();
  if (btn) {
    btn.innerHTML = dark ? SUN : MOON;
    const label = dark ? 'Switch to daylight theme' : 'Switch to Dawn Mode (dark)';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
  // Keep a visible Settings toggle in step if one is on screen.
  document.querySelectorAll('.theme-checkbox').forEach((c) => { c.checked = dark; });
}

// Floating button, mounted once at boot alongside the About button.
export function mountThemeToggle() {
  if (btn) return;
  btn = el('button.theme-btn', {
    id: 'theme-btn',
    onclick: () => toggleTheme(),
  });
  document.body.append(btn);
  syncControls();
}
