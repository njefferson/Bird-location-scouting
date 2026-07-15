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

// Camera glyph on the facet-icon contract (24×24, stroke, currentColor).
export const CAMERA = '<path d="M4 8h3.2l1.9-2.5h5.8L16.8 8H20a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.4" r="3.4"/>';

/**
 * The standing photo-first chip for the Ranking header. Always present; reads
 * "Photo-first" or "Every bird equal" so the current ranking is never silent.
 * Tapping opens the explainer with the toggle (and the tables behind it).
 */
export function photoChip(nav) {
  const on = photoFirstOn();
  const suspended = on && targetsRankActive();
  return el('button.facet-entry.photo-entry', {
    class: on ? 'photo-on' : '',
    title: on
      ? (suspended
        ? 'Photo-first is on, but your target-presence ranking counts frequency only — tap for details'
        : 'Photo-first ranking: easy-to-shoot birds count for more — tap for how, or to rank every bird equally')
      : 'Every bird counts equally — tap to rank easiest shots first',
    onclick: () => openPhotoInfo(() => nav.rerender()),
  }, [
    el('span.facet-entry-mark', { 'aria-hidden': 'true', html: facetSvg(CAMERA, 18) }),
    el('span.facet-entry-main', { class: on ? '' : 'dim' },
      on ? (suspended ? 'Photo-first (paused by ★ ranking)' : 'Photo-first: easiest shots rank higher') : 'Every bird counts equally'),
    el('span.facet-entry-go', { 'aria-hidden': 'true' }, '⋯'),
  ]);
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
        el('strong', {}, '★ Paused right now: '),
        'your “rank by target presence” toggle is on, and that ranking promised to count frequency only. Photo-first resumes when you turn it off.',
      ]) : null,
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
