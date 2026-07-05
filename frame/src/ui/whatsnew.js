// =============================================================================
// WHAT'S NEW POP-UP — shown ONCE per release, right after the app updates.
// =============================================================================
// On boot, compare the newest changelog version against the last version this
// device has seen (localStorage). Different → show the newest release's notes
// in a small dialog; dismissing it (button, backdrop, or Esc) records the
// version so it never shows again until the next release.
//
// Fresh-install detection: on a device that has never run the app, there is no
// controlling service worker yet at boot (navigator.serviceWorker.controller
// is null) — a brand-new user gets NO pop-up (everything is new to them), just
// a silent seed of the current version. A device upgrading from an older build
// IS controlled by the previous service worker, so it gets the pop-up even if
// it predates this feature and has no stored version.
// =============================================================================

import { el } from './dom.js';
import { CHANGELOG } from '../data/changelog.js';

const KEY = 'frame.seenVersion';

export function maybeShowWhatsNew() {
  const latest = CHANGELOG[0];
  if (!latest) return;

  let seen = null;
  try { seen = localStorage.getItem(KEY); } catch { return; } // no storage → never nag
  const remember = () => { try { localStorage.setItem(KEY, latest.version); } catch {} };

  if (seen === latest.version) return;
  const isUpgrade = !!navigator.serviceWorker?.controller;
  if (!seen && !isUpgrade) { remember(); return; } // first-ever run: seed silently

  const dialog = el('dialog.about-dialog.whatsnew-dialog', {}, [
    el('div.about-body', {}, [
      el('h2', {}, `What’s new — ${latest.version}`),
      el('p.rel-date', {}, latest.date),
      el('ul', {}, latest.changes.map((c) => el('li', {}, c))),
      el('button.btn.whatsnew-ok', { onclick: () => dialog.close() }, 'Got it'),
    ]),
  ]);
  dialog.addEventListener('close', () => { remember(); dialog.remove(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.append(dialog);
  dialog.showModal();
}
