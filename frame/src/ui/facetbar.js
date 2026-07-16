// =============================================================================
// FACET FILTER UI — the standing bar, the full tri-state picker dialog, and the
// collapsed header chip. Tapping any facet icon (here or on a card) cycles it
// neutral → wanted → excluded → neutral. The bar and chip mirror the targets /
// New-for-me pattern: they only appear while a filter is on, and each carries a
// one-tap "Show all birds" exit.
// =============================================================================
import { el } from './dom.js';
import { FACETS, GUILDS, facetSvg } from '../data/facets.js';
import { facetState, cycleFacet, clearFacets, facetsActive, facetSummary } from '../model/facets.js';

// Funnel glyph shared by the bar mark and the entry chip.
const FUNNEL = facetSvg('<path d="M3 5h18l-7 8v6l-4-2v-6z"/>', 18);

/**
 * A dim guild silhouette for a species — the "kind of bird" cue shown alongside
 * a bird's name/facets wherever it's listed (guild-level; there is no per-species
 * artwork). Colour/opacity come from CSS (.sp-facet-bird / .sp-name-bird).
 */
export function guildBird(s, cls = 'sp-facet-bird', size = 22) {
  const g = GUILDS[s.guild];
  return el(`span.${cls}`, { 'aria-hidden': 'true', html: facetSvg(g ? g.icon : '', size) });
}

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

/**
 * A single species-facet icon rendered as a tri-state filter button — the same
 * control as the card's guild row, but for one specific value a species carries
 * (its type, size, nest or behaviour). Tapping cycles want → exclude → off and
 * calls `onChange` so the caller can refresh its list and the standing bar.
 * This is what makes the facet icons "do things" wherever they appear: the
 * species matrix, the species page, and the target / seen pickers.
 *
 *   opts.size    icon px (default 20)
 *   opts.label   true → append the value's label beside the icon (chip form)
 *   opts.onChange called after the state cycles
 */
export function facetIconButton(facetKey, valueKey, opts = {}) {
  const { size = 20, label = false, onChange } = opts;
  const f = FACETS.find((x) => x.key === facetKey);
  const v = f?.values[valueKey];
  if (!v) return null;
  const btn = el('button.sp-fi-btn' + (label ? '.labelled' : ''), { type: 'button' });
  const paint = () => {
    const st = facetState(facetKey, valueKey);
    btn.className = 'sp-fi-btn' + (label ? ' labelled' : '') + (st !== 'neutral' ? ' ' + st : '');
    btn.setAttribute('aria-pressed', st !== 'neutral' ? 'true' : 'false');
    const cue = st === 'wanted' ? 'wanted — tap to exclude'
      : st === 'excluded' ? 'excluded — tap to clear'
      : 'tap to filter to this';
    btn.title = `${f.label}: ${v.label} — ${v.blurb} · ${cue}`;
    btn.setAttribute('aria-label', `Filter ${f.label.toLowerCase()} ${v.label}: ${st === 'neutral' ? 'off' : st}`);
  };
  btn.append(el('span.sp-fi', { 'aria-hidden': 'true', html: facetSvg(v.icon, size) }));
  if (label) btn.append(el('span.sp-fi-txt', {}, v.label));
  btn.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    cycleFacet(facetKey, valueKey); paint(); onChange?.();
  });
  paint();
  return btn;
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
