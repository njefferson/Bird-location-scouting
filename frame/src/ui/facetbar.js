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

// One glyph per facet CATEGORY (the accordion head): Type = a dove, Size = a
// ruler, Nest = an egg, Behaviour = binoculars (how findable a bird is). The dove
// and binoculars are from the public-domain game-icons set (CC-BY 3.0, credited in
// ui/about.js), fitted to the 24-box and given a matching-colour stroke so their
// fine detail reads at full strength at tile size; the ruler and egg are drawn here.
const CAT_ICON = {
  guild: `<g transform="translate(-0.26 0.23) scale(0.0473)"><path stroke="currentColor" stroke-width="28" stroke-linejoin="round" stroke-linecap="round" d="M38.643 17.275L32.215 59.47c20.354 23.085 48.127 40.682 79.195 56-29.677-4.055-58.635-12.142-84.64-24.868-.292 8.613-.584 26.252.896 35.58 23.024 8.994 48.88 14.026 75.95 16.728-23.698 5.377-47.716 7.58-71.425 6.95 2.665 9.36 7.325 22.24 11.26 31.675 22.547-1.977 45.912-7.504 69.36-15.47-18.785 14.27-39.05 26.146-60.185 35.322l28.877 30.056 17.144-9.898-5.978 22.312c6.788 6.61 20.498 15.434 27.56 20.623l13.268-11.662-.338 20.2c19.91 13.99 41.056 12.083 61.15 1.718-.804 6.438-1.308 13.29-1.482 20.56C132.47 314.7 66.666 320.958 70.59 348.222l34.553 6.947-34.108 18.04c1.503 7.398 3.84 15.003 7.73 22.677L120.1 379.56 92.17 416.226c4.726 6.13 14.61 14.823 20.537 20.515l39.47-46.24-17.962 63.475c6.238 4.326 19.387 9.33 26.273 12.87l43.313-71.076-14.138 80.248c17.225 3.487 20.708 4.81 39.82 3.19l18.186-75.66 20.297 71.852c7.333-2.51 23.21-9.526 29.976-12.664l-11.794-59.3 35.372 45.14c7.232-5.076 18.943-11.587 24.316-17.328l-17.994-37.326 31.973 18.19c25.568-17.19-44.333-57.458-86.944-100.22 6.416-8.725 11.636-17.086 15.786-25.042 19.45 27.668 44.75 39.74 75.84 29.93l-1.176-21.815 16.002 14.943c7.52-4.34 15.072-10.137 22.48-16.166l-6.99-19.133 18.694 8.745c12.732-6.638 22.917-17.1 33.08-27.59-16.19-12.562-32.92-27.903-47.49-40.242 17.74 9.162 38.718 17.52 56.892 23.95 4.27-7.49 12.045-21.063 15.463-28.7-19.626-4.04-39.435-11.263-58.413-20.58 23.383 2.56 45.728 3.05 66.367-1.138 2.805-8.642 9.82-22.678 11.123-30.996-23.616 6.897-49.242 8.78-74.923 7.03 28.832-9.016 55.294-21.066 75.56-39.81L485.69 93c-84.44 76.087-173.95 30.858-210.133 83.916-5.043-1.298-10.115-1.43-14.932-.56-14.7-80.695-139.033-53.424-221.982-159.083zM293 226.155l-9.643 45.806-23.623-44.347c10.196 4.382 20.545 8.023 33.266-1.457z"/></g>`,
  size: `<path fill-rule="evenodd" d="M2.5 9c0-.66.54-1.2 1.2-1.2h16.6c.66 0 1.2.54 1.2 1.2v6c0 .66-.54 1.2-1.2 1.2H3.7c-.66 0-1.2-.54-1.2-1.2V9zm3.9 0v2.4h1v-2.4h-1zm3.5 0v3.4h1V9h-1zm3.5 0v2.4h1V9h-1zm3.5 0v3.4h1V9h-1z"/>`,
  nest: `<path d="M12 3.6c3.15 0 5.6 5 5.6 9.2 0 3.95-2.5 6.9-5.6 6.9s-5.6-2.95-5.6-6.9c0-4.2 2.45-9.2 5.6-9.2z"/>`,
  behavior: `<g transform="translate(-0.01 -0.01) scale(0.0469)"><path stroke="currentColor" stroke-width="28" stroke-linejoin="round" stroke-linecap="round" d="M186.436 86.738c-9.044 0-19.112 5.87-26.735 21.114l-6.807 13.62c2.48-.203 4.968-.31 7.455-.31 18.02 0 36.005 5.363 51.87 15.977v-30.984c-7.5-13.917-17.102-19.418-25.782-19.418zm139.128 0c-8.68 0-18.28 5.5-25.78 19.418v30.994c18.064-12.06 38.895-17.28 59.345-15.638l-6.83-13.66c-7.624-15.245-17.692-21.114-26.736-21.114zm-165.216 51.926c-19.05 0-38.08 7.693-53.74 23l-37.38 65.418c14.492-6.743 30.633-10.518 47.64-10.518 39.96 0 75.16 20.792 95.35 52.124V159.846c-15.293-14.115-33.58-21.182-51.87-21.182zm192.433.033c-18.662-.306-37.39 6.74-52.997 21.145v108.845c20.19-31.33 55.39-52.123 95.348-52.123 17.01 0 33.15 3.775 47.643 10.518l-37.38-65.418c-15.35-15.003-33.95-22.66-52.612-22.967zM256 151.957c-5.113 0-11.882 2.775-25.783 9.627v133.014c7.246-5.314 16.164-8.467 25.783-8.467 9.62 0 18.537 3.154 25.783 8.468V161.584c-13.9-6.852-20.67-9.627-25.783-9.627zm-139.13 82.607c-52.767 0-95.35 42.582-95.35 95.348s42.583 95.35 95.35 95.35c52.765 0 95.347-42.584 95.347-95.35 0-52.766-42.582-95.348-95.348-95.348zm278.26 0c-52.765 0-95.347 42.582-95.347 95.348s42.582 95.35 95.348 95.35c52.767 0 95.35-42.584 95.35-95.35 0-52.766-42.583-95.348-95.35-95.348zm-279.827 19.004c1.223-.018 2.448-.008 3.674.03 7.344.225 14.694 1.462 21.77 3.816 36.842 11.343 59.745 51.664 50.622 89.11-7.652 37.743-45.455 64.51-83.595 59.17-38.748-3.865-69.376-39.578-67.16-78.483.167-11.41 3.133-22.336 8.2-32.124A26.087 26.087 0 0 0 73.39 312.52a26.087 26.087 0 0 0 26.09-26.084 26.087 26.087 0 0 0-17.447-24.584c9.058-4.694 19.097-7.594 29.606-8.147 1.218-.072 2.44-.118 3.663-.137zm278.26 0c1.223-.018 2.448-.008 3.673.03 7.344.225 14.696 1.462 21.774 3.816 36.84 11.343 59.742 51.664 50.62 89.11-7.652 37.742-45.453 64.51-83.59 59.173-38.75-3.865-69.38-39.582-67.163-78.488.167-11.41 3.133-22.334 8.2-32.122a26.087 26.087 0 0 0 24.575 17.433 26.087 26.087 0 0 0 26.086-26.084 26.087 26.087 0 0 0-17.443-24.584c9.057-4.694 19.095-7.594 29.603-8.147 1.22-.072 2.44-.118 3.664-.137zM256 304.13c-14.346 0-25.783 11.436-25.783 25.782s11.437 25.783 25.783 25.783c14.346 0 25.783-11.437 25.783-25.783 0-14.346-11.437-25.78-25.783-25.78z"/></g>`,
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
    const wanted = sub ? sub.wanted.length : 0;
    const excluded = sub ? sub.excluded.length : 0;
    cats.append(el('button.ffp-cat' + (open ? '.open' : ''), {
      'aria-expanded': open ? 'true' : 'false',
      title: open ? `Hide ${f.label.toLowerCase()} options` : `Filter by ${f.label.toLowerCase()}`,
      onclick: () => { OPEN_CAT = open ? null : f.key; nav.rerender(); },
    }, [
      el('span.ffp-cat-ico', { 'aria-hidden': 'true', html: facetSvg(CAT_ICON[f.key], 22) }),
      el('span.ffp-cat-label', {}, f.label),
      // Two corner tallies: GREEN +N = must-include, RED −N = exclude. The
      // symbol carries the meaning (colour-blind-safe — /ACCESSIBILITY.md A1);
      // the hue is reinforcement. Each shows only when it has a count.
      (wanted || excluded) ? el('span.ffp-cat-counts', { 'aria-hidden': 'true' }, [
        wanted ? el('span.ffp-cat-count.want', { title: `${wanted} must-include` }, `+${wanted}`) : null,
        excluded ? el('span.ffp-cat-count.block', { title: `${excluded} excluded` }, `−${excluded}`) : null,
      ]) : null,
      el('span.ffp-cat-chev', { 'aria-hidden': 'true' }, open ? '▾' : '▸'),
    ]));
  });
  panel.append(cats);

  if (OPEN_CAT) {
    const f = FACETS.find((x) => x.key === OPEN_CAT);
    const vals = el('div.ffp-vals', {}, Object.values(f.values).map((v) =>
      facetIconButton(f.key, v.key, { size: 18, label: true, onChange: () => nav.rerender() })));
    panel.append(vals);
    panel.append(el('p.ffp-help', {}, 'All show by default · tap to require it · again to exclude it · again to clear.'));
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
