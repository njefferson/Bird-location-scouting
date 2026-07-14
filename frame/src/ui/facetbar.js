// =============================================================================
// FACET FILTER UI — the standing bar, the full tri-state picker dialog, and the
// collapsed header chip. Tapping any facet icon (here or on a card) cycles it
// neutral → wanted → excluded → neutral. The bar and chip mirror the targets /
// New-for-me pattern: they only appear while a filter is on, and each carries a
// one-tap "Show all birds" exit.
// =============================================================================
import { el } from './dom.js';
import { FACETS, facetSvg } from '../data/facets.js';
import { facetState, cycleFacet, clearFacets, facetsActive, facetSummary } from '../model/facets.js';

// Funnel glyph shared by the bar mark and the entry chip.
const FUNNEL = facetSvg('<path d="M3 5h18l-7 8v6l-4-2v-6z"/>', 18);

function valueLabel(facetKey, valueKey) {
  const f = FACETS.find((x) => x.key === facetKey);
  return f?.values[valueKey]?.label || valueKey;
}

// Compact human summary of one active facet: "Type: Waders, Egrets · not Skulker".
function summaryChips() {
  return facetSummary().map((fs) => {
    const f = FACETS.find((x) => x.key === fs.facet);
    const parts = [];
    if (fs.wanted.length) parts.push(fs.wanted.map((k) => valueLabel(fs.facet, k)).join(', '));
    if (fs.excluded.length) parts.push('not ' + fs.excluded.map((k) => valueLabel(fs.facet, k)).join(', '));
    return el('span.facet-chip', {}, [el('strong', {}, f.label + ': '), parts.join(' · ')]);
  });
}

/**
 * Standing filter indicator, prepended to Ranking / Planner / Map / detail.
 * Null unless a facet filter is actually on.
 */
export function facetBar(state, nav, rerender) {
  if (!facetsActive()) return null;
  const bar = el('div.facetbar.engaged');
  bar.append(el('span.tb-mark', { 'aria-hidden': 'true', html: FUNNEL }));
  bar.append(el('span.tb-label', {}, summaryChips()));
  bar.append(el('div.tb-actions', {}, [
    el('button.btn.small', { onclick: () => { clearFacets(); rerender(); } }, 'Show all birds'),
    el('button.btn.ghost.small', { onclick: () => openFacetPicker(rerender) }, 'Edit'),
  ]));
  return bar;
}

/**
 * The collapsed header entry for the Ranking view: a "+" chip that opens the
 * full picker. When filters are on it summarises them; otherwise it invites.
 */
export function facetEntryChip(nav) {
  const on = facetsActive();
  const chip = el('button.facet-entry', {
    title: on ? 'Edit your bird filters' : 'Filter by bird type, size, nest or behaviour',
    onclick: () => openFacetPicker(() => nav.rerender()),
  }, [
    el('span.facet-entry-mark', { 'aria-hidden': 'true', html: FUNNEL }),
    on
      ? el('span.facet-entry-main', {}, summaryChips())
      : el('span.facet-entry-main.dim', {}, 'Filter by bird'),
    el('span.facet-entry-go', { 'aria-hidden': 'true' }, on ? '⋯' : '+'),
  ]);
  return chip;
}

// One tappable value in the picker grid — icon + label, cycles on tap.
function pickButton(facetKey, v, onChange) {
  const glyph = el('span.fi-glyph', { 'aria-hidden': 'true', html: facetSvg(v.icon, 24) });
  const label = el('span.fi-label', {}, v.label);
  const state = el('span.fi-state', { 'aria-hidden': 'true' });
  const btn = el('button.facet-pick', { title: v.blurb });
  const paint = () => {
    const st = facetState(facetKey, v.key);
    btn.className = 'facet-pick' + (st !== 'neutral' ? ' ' + st : '');
    btn.setAttribute('aria-pressed', st !== 'neutral' ? 'true' : 'false');
    state.textContent = st === 'wanted' ? 'want' : st === 'excluded' ? 'exclude' : '';
    btn.setAttribute('aria-label', `${v.label}: ${st}`);
  };
  btn.addEventListener('click', () => { cycleFacet(facetKey, v.key); paint(); onChange?.(); });
  btn.append(glyph, label, state);
  paint();
  return btn;
}

/**
 * The full tri-state picker in a modal <dialog> (Esc / backdrop to close). Four
 * sections; each value cycles want → exclude → off on tap. Closing re-renders
 * the view behind it via `rerender`.
 */
export function openFacetPicker(rerender) {
  const sections = el('div.facet-sections');
  const dialog = el('dialog.facet-dialog', {}, [
    el('button.si-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
    el('div.facet-dialog-head', {}, [
      el('h2', {}, 'Filter by bird'),
      el('p.dim', {}, 'Tap to want a group, tap again to exclude it, once more to clear. These are behavioural likelihoods, not promises.'),
    ]),
    sections,
  ]);

  const clearBtn = el('button.btn.ghost.small', { onclick: () => { clearFacets(); repaint(); } }, 'Clear all');
  function repaint() {
    // Rebuild sections so every button reflects the (possibly cleared) state.
    sections.replaceChildren(...FACETS.map((f) => el('section.facet-sec', {}, [
      el('h3', {}, f.label),
      el('div.facet-grid', {}, Object.values(f.values).map((v) => pickButton(f.key, v))),
    ])));
    clearBtn.disabled = !facetsActive();
  }
  repaint();

  dialog.append(el('div.facet-dialog-foot', {}, [
    clearBtn,
    el('button.btn.small', { onclick: () => dialog.close() }, 'Done'),
  ]));

  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialog.remove(); rerender?.(); });
  document.body.append(dialog);
  dialog.showModal();
}
