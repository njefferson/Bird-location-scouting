// =============================================================================
// DATA-FRESHNESS BANNER — a calm, honest notice when the committed eBird data
// has aged past its horizon.
// =============================================================================
// Null while the data is fresh (the common case) or already dismissed for this
// build date. Because seasonal frequency ages gently, the copy reassures as
// much as it warns — and the exact build date always lives in Settings and the
// score footer for anyone who wants it. This is the app's graceful-aging
// posture: if the quarterly refresh ever stops for good, Frame keeps working
// and simply tells the truth about its age instead of going stale in silence.
// =============================================================================
import { el } from './dom.js';
import { regionMeta } from '../model/regions.js';
import { freshness } from '../model/freshness.js';

// Remembers the build date the user has already acknowledged, so a stale
// dataset nags once, not every launch. A future refresh writes a newer date, so
// the banner naturally returns only if the *new* data is itself old.
const DISMISS_KEY = 'frame.freshnessDismissed';

function dismissedFor(builtAt) {
  try { return localStorage.getItem(DISMISS_KEY) === builtAt; } catch { return false; }
}
function rememberDismiss(builtAt) {
  try { localStorage.setItem(DISMISS_KEY, builtAt); } catch { /* private mode — banner just reappears */ }
}

// Small clock glyph; stroke = currentColor so the tier colour drives it.
const CLOCK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

/**
 * The standing freshness notice, prepended to the main views. Returns null
 * while the data is fresh or the user has dismissed this build date. `nav` is
 * used to re-render after dismissal and to offer a way forward (Settings, where
 * the refresh story lives).
 */
export function freshnessBanner(nav) {
  const meta = regionMeta();
  if (!meta.loaded || !meta.builtAt) return null;
  const f = freshness(meta.builtAt);
  if (f.tier === 'fresh') return null;
  if (dismissedFor(meta.builtAt)) return null;

  const archived = f.tier === 'archived';
  const bar = el('div.freshbar', { class: archived ? 'archived' : '' });

  bar.append(el('span.fresh-ico', { html: CLOCK, 'aria-hidden': 'true' }));
  bar.append(el('span.fresh-msg', {}, archived
    ? [
        el('strong', {}, 'Running as an archive.'),
        ` This eBird data is a snapshot from ${f.label}. Seasonal patterns hold up well over time, so it’s still a useful guide — just treat the specific numbers as historical.`,
      ]
    : [
        el('strong', {}, 'Older data.'),
        ` This eBird data hasn’t refreshed since ${f.label}. Seasonal patterns are stable, so it’s still a good guide — just older than the usual quarterly update.`,
      ]));

  bar.append(el('div.fresh-actions', {}, [
    // A way forward: Settings explains the quarterly refresh and shows the date.
    el('button.btn.ghost.small', { onclick: () => nav.go('#/settings') }, 'Details'),
    el('button.fresh-x', {
      'aria-label': 'Dismiss this notice',
      onclick: () => { rememberDismiss(meta.builtAt); nav.rerender(); },
    }, '×'),
  ]));
  return bar;
}
