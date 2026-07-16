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

// One glyph per facet CATEGORY (the accordion head). Nest & Behaviour reuse a
// representative value glyph; Type & Size get simple purpose-built marks.
const _vals = (k) => FACETS.find((f) => f.key === k).values;
const CAT_ICON = {
  guild: '<path d="M3.5 12.6c0-2.5 2-4.6 4.6-4.6 1.5 0 2.8.7 3.7 1.7L20 8l-3.7 3.6c.3.6.4 1.3.4 2 0 2.9-2.6 4.9-6.6 4.9s-6.6-2.4-6.6-4.9z"/><circle cx="8" cy="11.4" r="1" fill="currentColor" stroke="none"/>',
  size: '<circle cx="7" cy="15" r="2.6"/><circle cx="16" cy="11" r="5.4"/>',
  nest: _vals('nest').bowl.icon,
  behavior: _vals('behavior').open.icon,
};

// Which accordion category is expanded. Module-level so it survives nav.rerender()
// (a facet tap re-ranks the whole view, which rebuilds this panel).
let OPEN_CAT = null;

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
 * The always-on filter for the Ranking header. A horizontal accordion: four
 * category buttons (Type / Size / Nest / Behaviour), each with a corner chevron
 * that signals it expands. Tapping one opens its value pills (tri-state: tap to
 * want, again to exclude, again to clear) and collapses the others. A small
 * three-tap explainer sits under the open values, and a compact always-visible
 * "lights" row below summarises what's currently filtered. Replaces the old
 * "Filter by bird" chip + modal picker, and never shares the card's presence look.
 */
export function facetFilterPanel(nav) {
  const panel = el('div.ffp');
  const cats = el('div.ffp-cats');
  FACETS.forEach((f) => {
    const open = OPEN_CAT === f.key;
    const sub = facetSummary().find((s) => s.facet === f.key);
    const n = sub ? sub.wanted.length + sub.excluded.length : 0;
    cats.append(el('button.ffp-cat' + (open ? '.open' : ''), {
      'aria-expanded': open ? 'true' : 'false',
      title: open ? `Hide ${f.label.toLowerCase()} options` : `Filter by ${f.label.toLowerCase()}`,
      onclick: () => { OPEN_CAT = open ? null : f.key; nav.rerender(); },
    }, [
      el('span.ffp-cat-ico', { 'aria-hidden': 'true', html: facetSvg(CAT_ICON[f.key], 22) }),
      el('span.ffp-cat-label', {}, f.label),
      n ? el('span.ffp-cat-count', { title: `${n} set` }, String(n)) : null,
      el('span.ffp-cat-chev', { 'aria-hidden': 'true' }, open ? '▾' : '▸'),
    ]));
  });
  panel.append(cats);

  if (OPEN_CAT) {
    const f = FACETS.find((x) => x.key === OPEN_CAT);
    const vals = el('div.ffp-vals', {}, Object.values(f.values).map((v) =>
      facetIconButton(f.key, v.key, { size: 18, label: true, onChange: () => nav.rerender() })));
    panel.append(vals);
    panel.append(el('p.ffp-help', {}, 'Tap once to want it · twice to exclude · again to clear.'));
  }

  panel.append(statusLights(nav));
  return panel;
}

// Compact, always-visible summary of what's filtered — a small "light" per set
// value (accent = wanted, red = excluded); neutral values are simply absent.
function statusLights(nav) {
  const active = facetSummary();
  const wrap = el('div.ffp-lights');
  if (!active.length) {
    wrap.append(el('span.ffp-lights-empty', {}, 'Showing all birds — open a category to filter.'));
    return wrap;
  }
  active.forEach((fs) => {
    const f = FACETS.find((x) => x.key === fs.facet);
    fs.wanted.forEach((k) => wrap.append(statusLight(f, k, 'want')));
    fs.excluded.forEach((k) => wrap.append(statusLight(f, k, 'exclude')));
  });
  wrap.append(el('button.ffp-clear', { title: 'Clear all filters', onclick: () => { clearFacets(); nav.rerender(); } }, 'Clear'));
  return wrap;
}
function statusLight(f, valueKey, kind) {
  const v = f.values[valueKey];
  return el(`span.ffp-light.${kind}`, {
    title: `${f.label}: ${v.label} — ${kind === 'want' ? 'wanted' : 'excluded'}`,
  }, el('span.ffp-light-ico', { 'aria-hidden': 'true', html: facetSvg(v.icon, 15) }));
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
