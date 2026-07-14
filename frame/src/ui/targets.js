// =============================================================================
// TARGET BIRDS — the picker screen (#/targets), the standing "mode" indicator,
// and a reusable star toggle. Building the list is direct manipulation: tap a
// star anywhere (here, a species page, a hotspot's matrix) and the ranking
// re-weights to YOUR birds. The mode announces itself with a standing bar and
// a non-destructive exit (Show all birds), per the product's taste rules.
// =============================================================================
import { el, clear } from './dom.js';
import { SPECIES } from '../data/species.js';
import { HABITATS } from '../data/habitats.js';
import { STATUS_LABEL } from '../model/inference.js';
import {
  isTarget, toggleTarget, targetCount, clearTargets,
  targetsEngaged, setEngaged, targetsActive,
} from '../model/targets.js';

// A species' dominant habitat, for grouping the picker into browsable sections.
function primaryHabitat(s) {
  const entries = Object.entries(s.habitats || {});
  if (!entries.length) return { key: 'other', label: 'Other' };
  const [key] = entries.sort((a, b) => b[1] - a[1])[0];
  return { key, label: HABITATS[key]?.label || key };
}

// A small photoability meter reused from the hotspot matrix' visual language.
function paMeter(s) {
  return el('span.photoability', { title: s.note, style: `--p:${Math.round(s.photoability * 100)}` }, [
    el('i'), el('span.pa-num', {}, s.photoability.toFixed(2)),
  ]);
}

/**
 * A star toggle for one species. `onToggle(nowTarget)` lets the caller update
 * its own surrounding UI (counts, banners) without a full re-render.
 */
export function starButton(s, onToggle) {
  const btn = el('button.star-btn', {
    'aria-label': isTarget(s.name) ? `Remove ${s.name} from your targets` : `Add ${s.name} to your targets`,
    title: isTarget(s.name) ? 'In your targets — tap to remove' : 'Add to your targets',
  });
  const paint = () => {
    const on = isTarget(s.name);
    btn.classList.toggle('on', on);
    btn.textContent = on ? '★' : '☆';
    btn.title = on ? 'In your targets — tap to remove' : 'Add to your targets';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  btn.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const now = toggleTarget(s.name);
    paint();
    onToggle?.(now);
  });
  paint();
  return btn;
}

/**
 * The standing mode indicator, prepended to Ranking / Planner / Map. Returns
 * null when the user has no targets yet (nothing to announce). When they do:
 *   engaged   → "Ranking your N target birds"  · [Show all birds] · [Edit]
 *   disengaged→ "Showing all birds"            · [Rank my N targets] · [Edit]
 * Toggling engagement never deletes the list — the exit is reversible.
 */
export function targetBar(state, nav, rerender) {
  const n = targetCount();
  if (!n) return null;
  const active = targetsActive();
  const bar = el('div.targetbar', { class: active ? 'engaged' : '' });

  const flip = () => { setEngaged(!targetsEngaged()); rerender(); };

  bar.append(el('span.tb-mark', { 'aria-hidden': 'true' }, '★'));
  bar.append(el('span.tb-label', {}, active
    ? [el('strong', {}, `Ranking your ${n} target bird${n === 1 ? '' : 's'}`), ' — only your birds count.']
    : [el('strong', {}, 'Showing all birds'), ` · your ${n} target${n === 1 ? '' : 's'} set aside.`]));

  bar.append(el('div.tb-actions', {}, [
    el('button.btn.small', { onclick: flip }, active ? 'Show all birds' : `Rank my ${n}`),
    el('button.btn.ghost.small', { onclick: () => nav.go('#/targets') }, 'Edit'),
  ]));
  return bar;
}

// =============================================================================
// PICKER (#/targets) — browse all curated species, star the ones you want.
// =============================================================================
export function renderTargets(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'),
    el('div.title-row', {}, [
      el('h1', {}, 'Target birds'),
      el('span.subtitle', {}, 'Pick the birds you actually want to photograph — your list, your ranking.'),
    ]),
  ]));

  // Standing summary: live count + the engage toggle + Clear, so the picker
  // itself shows whether your list is driving the ranking and lets you exit.
  const summary = el('div.tg-summary');
  const listWrap = el('div.tg-list');

  function repaintSummary() {
    clear(summary);
    const n = targetCount();
    const engaged = targetsEngaged();
    summary.append(el('span.tg-count', {}, n
      ? `${n} bird${n === 1 ? '' : 's'} chosen`
      : 'No targets yet — tap a star to add one.'));
    if (n) {
      const toggle = el('label.tg-toggle', {}, [
        el('span', {}, 'Rank by my targets'),
        (() => { const c = el('input', { type: 'checkbox' }); c.checked = engaged; c.addEventListener('change', () => { setEngaged(c.checked); repaintSummary(); }); return c; })(),
      ]);
      summary.append(toggle);
      summary.append(el('button.btn.ghost.small', {
        onclick: () => { clearTargets(); repaintList(); repaintSummary(); },
      }, 'Clear all'));
    }
  }

  const search = el('input.search', { type: 'search', placeholder: 'Filter species…', value: state.targetQuery || '' });
  search.addEventListener('input', () => { state.targetQuery = search.value; repaintList(); });

  function repaintList() {
    clear(listWrap);
    const q = (state.targetQuery || '').trim().toLowerCase();
    const match = SPECIES.filter((s) => !q || s.name.toLowerCase().includes(q));
    if (!match.length) { listWrap.append(el('p.dim', {}, 'No species match that filter.')); return; }

    // Group by dominant habitat; within a group, most-shootable first. A live
    // filter flattens to a single "Matches" group so results aren't buried.
    const groups = new Map();
    for (const s of match) {
      const g = q ? { key: 'matches', label: 'Matches' } : primaryHabitat(s);
      if (!groups.has(g.key)) groups.set(g.key, { label: g.label, items: [] });
      groups.get(g.key).items.push(s);
    }
    for (const { label, items } of groups.values()) {
      items.sort((a, b) => b.photoability - a.photoability);
      listWrap.append(el('h2.tg-group', {}, label));
      for (const s of items) listWrap.append(row(s));
    }
  }

  function row(s) {
    const node = el('div.tg-row', { class: isTarget(s.name) ? 'on' : '' }, [
      starButton(s, () => { node.classList.toggle('on', isTarget(s.name)); repaintSummary(); }),
      el('div.tg-row-main', {}, [
        el('span.tg-name', {}, s.name),
        el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
      ]),
      paMeter(s),
    ]);
    return node;
  }

  repaintSummary();
  repaintList();
  root.append(summary);
  root.append(el('div.search-wrap', {}, search));
  root.append(el('p.dim.tg-hint', {}, 'Grouped by each bird’s main habitat, most-shootable first. Photoability is how easy the bird is to photograph at reach — it still weights your list, so an easy target ranks a spot higher than a hard one.'));
  root.append(listWrap);
}
