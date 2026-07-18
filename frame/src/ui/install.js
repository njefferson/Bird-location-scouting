// =============================================================================
// INSTALL — how to add Frame to your home screen (a real PWA install)
// =============================================================================
// Frame is a website that installs like an app: on the home screen it runs
// full-screen and offline with no browser chrome. But nothing tells a new user
// HOW — on iPhone/iPad the OS hides it behind the Share sheet. So:
//   • a calm, dismissible banner points new users at the steps (or fires the
//     native install sheet where the browser offers one);
//   • the full, platform-specific steps ALSO live permanently in Settings, so
//     they're one tap away even after the banner is dismissed.
// Nothing shows once the app is already installed (running standalone).
// =============================================================================
import { el } from './dom.js';

const DISMISS_KEY = 'frame.installDismissed';

// Chrome/Edge (Android + desktop) fire `beforeinstallprompt`; stash it so a
// button can open the real OS install sheet. iOS Safari never fires it — there
// the only route is Share → Add to Home Screen, which we spell out.
let deferredPrompt = null;
let justInstalled = false;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', () => { justInstalled = true; deferredPrompt = null; });
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// iPadOS Safari reports as "MacIntel" with touch — treat it as iOS.
export function platform() {
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function dismissed() { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } }
function rememberDismiss() { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode — reappears */ } }

function canPrompt() { return !!deferredPrompt; }
async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

// iOS Share glyph (square with an up arrow) so step 1 matches what's on screen.
const SHARE_GLYPH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/></svg>';
const PHONE_GLYPH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';

// Platform-specific steps, shared by the banner's dialog and the Settings entry.
function stepsFor(p) {
  if (p === 'ios') {
    return [
      el('p', {}, 'On iPhone or iPad, in Safari:'),
      el('ol.install-steps', {}, [
        el('li', {}, ['Tap the ', el('strong', {}, 'Share'), ' button ',
          el('span.inline-ico', { 'aria-hidden': 'true', html: SHARE_GLYPH }),
          ' (bottom or top of Safari).']),
        el('li', {}, ['Scroll down and tap ', el('strong', {}, 'Add to Home Screen'), '.']),
        el('li', {}, ['Tap ', el('strong', {}, 'Add'), '. Frame lands on your home screen and opens full-screen — and works with no signal in the field.']),
      ]),
      el('p.dim', {}, '“Add to Home Screen” is a Safari feature. If you’re in Chrome or another browser, open this page in Safari first.'),
    ];
  }
  if (p === 'android') {
    return [
      el('p', {}, 'On Android, in Chrome:'),
      el('ol.install-steps', {}, [
        el('li', {}, ['Tap ', el('strong', {}, 'Install Frame'), ' above, or open the ', el('strong', {}, '⋮'), ' menu and choose ', el('strong', {}, 'Install app'), ' (or ', el('strong', {}, 'Add to Home screen'), ').']),
        el('li', {}, ['Confirm. Frame installs and opens full-screen — and works offline in the field.']),
      ]),
    ];
  }
  return [
    el('p', {}, 'On a computer, in Chrome or Edge:'),
    el('ol.install-steps', {}, [
      el('li', {}, ['Click ', el('strong', {}, 'Install Frame'), ' above, or the install icon in the address bar (a monitor with a ↓).']),
      el('li', {}, ['Confirm. Frame opens in its own window.']),
    ]),
  ];
}

// The shared help body: a native Install button when the browser offers one,
// then the written steps. Used in the dialog and the Settings section.
function helpBody() {
  if (isStandalone()) return [el('p.install-done', {}, '✓ Frame is installed — you’re running the home-screen app.')];
  if (justInstalled) return [el('p.install-done', {}, '✓ Installed. Open Frame from your home screen.')];
  const kids = [];
  if (canPrompt()) {
    const btn = el('button.btn.primary', {}, 'Install Frame');
    btn.addEventListener('click', async () => {
      const ok = await promptInstall();
      if (ok) btn.replaceWith(el('p.install-done', {}, '✓ Installing — look for Frame on your home screen.'));
    });
    kids.push(btn);
  }
  kids.push(...stepsFor(platform()));
  return kids;
}

// A modal with the full steps — opened from the banner's button.
export function openInstallHelp() {
  const dlg = el('dialog.install-dialog', {}, [
    el('button.about-close', { 'aria-label': 'Close', onclick: () => dlg.close() }, '×'),
    el('div.install-body', {}, [el('h2', {}, 'Add Frame to your home screen'), ...helpBody()]),
  ]);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

// Permanent Settings entry — always available, ignores the banner dismissal.
export function installSettingsBody() {
  return [
    el('p.dim', {}, 'Frame runs best added to your home screen: full-screen, and offline in the field with no signal.'),
    ...helpBody(),
  ];
}

// The standing new-user banner. Null once installed or dismissed, so it nudges
// once and then stays out of the way — the steps live on in Settings.
export function installBanner(nav) {
  if (isStandalone() || justInstalled || dismissed()) return null;
  const bar = el('div.installbar');
  bar.append(el('span.install-ico', { 'aria-hidden': 'true', html: PHONE_GLYPH }));
  bar.append(el('span.install-msg', {}, [
    el('strong', {}, 'Install Frame'),
    ' — add it to your home screen to open full-screen and use it offline in the field.',
  ]));
  const primary = canPrompt()
    ? (() => { const b = el('button.btn.primary.small', {}, 'Install'); b.addEventListener('click', async () => { const ok = await promptInstall(); if (ok) nav.rerender(); else openInstallHelp(); }); return b; })()
    : el('button.btn.ghost.small', { onclick: () => openInstallHelp() }, 'How');
  bar.append(el('div.install-actions', {}, [
    primary,
    el('button.fresh-x', { 'aria-label': 'Dismiss — find this later in Settings', onclick: () => { rememberDismiss(); nav.rerender(); } }, '×'),
  ]));
  return bar;
}
