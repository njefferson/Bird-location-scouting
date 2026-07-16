// =============================================================================
// PHOTO-FIRST UI — the standing chip on the ranked views + the explainer dialog
// that holds the toggle. Photo-first is the DEFAULT, so unlike the target/new/
// filter bars (which appear only when engaged) this chip is ALWAYS present on
// the Ranking header: it announces which ranking you're looking at in both
// states and is the obvious one-tap way to switch. Honesty by construction:
// the full weight tables are printed in the dialog — nothing is hidden.
// =============================================================================
import { el } from './dom.js';
import { facetSvg, BEHAVIORS, SIZES } from '../data/facets.js';
import { photoFirstOn, setPhotoFirst, SHOOT_BEHAVIOR, SHOOT_SIZE, xw } from '../model/photo.js';
import { targetsRankActive } from '../model/targets.js';
import { cameraMark } from './targets.js';

// Camera glyph on the facet-icon contract (24×24, stroke, currentColor).
export const CAMERA = '<path d="M4 8h3.2l1.9-2.5h5.8L16.8 8H20a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.4" r="3.4"/>';

/**
 * The photo-first control for the Ranking header. A REAL toggle: tapping it flips
 * the ranking immediately and shows the new state (it never opens a menu). The
 * camera is filled/gold when on, a faint outline when off; the ⓘ opens the
 * how-it-works explainer (weight tables) without toggling anything.
 */
export function photoChip(nav) {
  const on = photoFirstOn();
  const suspended = on && targetsRankActive();
  const toggle = el('button.photo-toggle', {
    class: on ? 'on' : '',
    'aria-pressed': on ? 'true' : 'false',
    title: on
      ? (suspended ? 'Photo-first is on, but your shot-list ranking counts frequency only — tap to turn photo-first off' : 'Photo-first ranking is ON — tap to count every bird equally')
      : 'Every bird counts equally — tap to rank the easiest shots first',
    onclick: () => { setPhotoFirst(!on); nav.rerender(); },
  }, [
    el('span.photo-toggle-mark', { 'aria-hidden': 'true', html: cameraMark(on) }),
    el('span.photo-toggle-main', {}, [
      el('strong', {}, on ? 'Photo-first: ON' : 'Photo-first: OFF'),
      el('span.photo-toggle-sub', {}, on
        ? (suspended ? 'paused by shot-list ranking' : 'easiest shots rank higher')
        : 'every bird counts equally'),
    ]),
    el('span.photo-toggle-state', { 'aria-hidden': 'true' }, on ? 'ON' : 'OFF'),
  ]);
  const info = el('button.photo-toggle-info', {
    'aria-label': 'How photo-first ranking works',
    title: 'How the weighting works',
    onclick: (ev) => { ev.preventDefault(); ev.stopPropagation(); openPhotoInfo(() => nav.rerender()); },
  }, 'ⓘ');
  return el('div.photo-row', {}, [toggle, info]);
}

// One weight table (behaviour or size) as explainer rows: icon · label · ×w.
function weightRows(vocab, table) {
  return Object.values(vocab).map((v) => el('div.pw-row', {}, [
    el('span.pw-icon', { 'aria-hidden': 'true', html: facetSvg(v.icon, 20) }),
    el('span.pw-label', { title: v.blurb }, v.label),
    el('span.pw-w', {}, xw(table[v.key] ?? 1)),
  ]));
}

/**
 * The photo-first explainer in a modal <dialog>: what the ranking does, the
 * complete weight tables, and the toggle. Closing re-renders the view behind.
 */
export function openPhotoInfo(rerender) {
  const dialog = el('dialog.facet-dialog.photo-dialog');

  function paint() {
    const on = photoFirstOn();
    const suspended = on && targetsRankActive();
    dialog.replaceChildren(
      el('button.si-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
      el('div.facet-dialog-head', {}, [
        el('h2', {}, 'Photo-first ranking'),
        el('p.dim', {}, 'Frame ranks hotspots for a camera, not a checklist: each bird’s real eBird frequency is weighted by how shootable that KIND of bird is — then the spots with the most shootable presence rank first.'),
      ]),
      // The scrollable body MUST live inside .facet-sections — that wrapper
      // carries the dialog's horizontal padding (the dialog itself is padding:0)
      // and the scroll. Placing notes/sections directly in the dialog made them
      // run edge-to-edge (the ×weights touched the right border). el() skips the
      // ★-paused row's null branch, so no stray "null" text node either.
      el('div.facet-sections', {}, [
        el('p.si-note', {}, [
          'The weight is worked out from the bird’s two published facts below — never a hidden per-bird judgment. ',
          'Every number the app shows (frequencies, the “N birds likely” count) stays the plain truth; only the ',
          el('strong', {}, 'order'), ' and colour intensity change.',
        ]),
        el('section.facet-sec', {}, [
          el('h3', {}, 'Behaviour — can you get on it?'),
          el('div.pw-rows', {}, weightRows(BEHAVIORS, SHOOT_BEHAVIOR)),
        ]),
        el('section.facet-sec', {}, [
          el('h3', {}, 'Size — how much frame it fills'),
          el('div.pw-rows', {}, weightRows(SIZES, SHOOT_SIZE)),
        ]),
        el('p.si-note.si-dim', {}, 'A bird’s weight is behaviour × size: an in-the-open large bird counts in full (×1); a skulking tiny one counts ×0.13 of its frequency.'),
        suspended ? el('p.si-targeting', {}, [
          el('strong', {}, 'Paused right now: '),
          'your “rank by shot-list presence” toggle is on, and that ranking promised to count frequency only. Photo-first resumes when you turn it off.',
        ]) : null,
      ]),
      el('div.facet-dialog-foot', {}, [
        el('label.row.pw-toggle', {}, [
          el('span', {}, on ? 'Photo-first is ON' : 'Photo-first is OFF — every bird counts equally'),
          (() => { const c = el('input', { type: 'checkbox' }); c.checked = on; c.addEventListener('change', () => { setPhotoFirst(c.checked); paint(); }); return c; })(),
        ]),
        el('button.btn.small', { onclick: () => dialog.close() }, 'Done'),
      ]),
    );
  }
  paint();

  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialog.remove(); rerender?.(); });
  document.body.append(dialog);
  dialog.showModal();
}
