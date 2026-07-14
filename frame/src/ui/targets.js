// =============================================================================
// TARGET BIRDS — the picker screen (#/targets), the standing presence-mode
// indicator, and a reusable star toggle. Starring is INFORMATIONAL: tap a star
// anywhere (here, a species page, a hotspot's matrix) and the bird joins your
// list, where the app tells you WHERE and WHEN to find it. Photoability never
// enters. One optional toggle — "rank by presence" — additionally sorts the
// hotspots by how often your targets appear; it announces itself with a standing
// bar and a non-destructive exit, per the product's taste rules.
// =============================================================================
import { el, clear, pct, sparkline } from './dom.js';
import { SPECIES } from '../data/species.js';
import { HABITATS } from '../data/habitats.js';
import { MONTHS, STATUS_LABEL } from '../model/inference.js';
import { bestForSpecies } from '../model/scoring.js';
import { getHotspots, activeRegion } from '../model/regions.js';
import { isSeen } from '../model/seen.js';
import {
  isTarget, toggleTarget, getTargets, targetCount, clearTargets,
  targetsRankOn, setTargetsRank, targetsRankActive,
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
 * The standing presence-mode indicator, prepended to Ranking / Planner / Map.
 * Returns null unless "rank by presence" is actually steering the ranking — a
 * mode only announces itself while it's on; starring is otherwise silent info.
 * When on: "Ranking by presence of your N targets" · [Show all birds] · [Edit].
 */
export function targetBar(state, nav, rerender) {
  if (!targetsRankActive()) return null;
  const n = targetCount();
  const bar = el('div.targetbar.engaged');
  bar.append(el('span.tb-mark', { 'aria-hidden': 'true' }, '★'));
  bar.append(el('span.tb-label', {}, [
    el('strong', {}, `Ranking by presence of your ${n} target bird${n === 1 ? '' : 's'}`),
    ' — how often they’re here, not how shootable.',
  ]));
  bar.append(el('div.tb-actions', {}, [
    el('button.btn.small', { onclick: () => { setTargetsRank(false); rerender(); } }, 'Show all birds'),
    el('button.btn.ghost.small', { onclick: () => nav.go('#/targets') }, 'Edit'),
  ]));
  return bar;
}

// =============================================================================
// PICKER (#/targets) — your list with where/when info, then browse & star.
// =============================================================================
export function renderTargets(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'),
    el('div.title-row', {}, [
      el('h1', {}, 'Target birds'),
      el('span.subtitle', {}, 'Star the birds you want — see where and when to find each one.'),
    ]),
  ]));

  // Standing summary: live count + the presence toggle + Clear.
  const summary = el('div.tg-summary');
  const yourList = el('div.tg-yourlist');
  const listWrap = el('div.tg-list');

  function repaintSummary() {
    clear(summary);
    const n = targetCount();
    summary.append(el('span.tg-count', {}, n
      ? `${n} bird${n === 1 ? '' : 's'} starred`
      : 'No targets yet — tap a star to add one.'));
    if (n) {
      const toggle = el('label.tg-toggle', {}, [
        el('span', {}, 'Rank hotspots by presence'),
        (() => { const c = el('input', { type: 'checkbox' }); c.checked = targetsRankOn(); c.addEventListener('change', () => setTargetsRank(c.checked)); return c; })(),
      ]);
      summary.append(toggle);
      summary.append(el('button.btn.ghost.small', {
        onclick: () => { clearTargets(); repaintYourList(); repaintList(); repaintSummary(); },
      }, 'Clear all'));
    }
  }

  // The informational payoff: for each starred bird, WHERE and WHEN in this
  // region — best hotspots + peak months, by presence (frequency), no
  // photoability. Seen birds stay visible but dimmed.
  function repaintYourList() {
    clear(yourList);
    const names = getTargets();
    if (!names.length) return;
    const hotspots = getHotspots();
    yourList.append(el('h2.tg-group', {}, `Your list — where & when in ${activeRegion().name}`));
    if (!hotspots.length) {
      yourList.append(el('p.dim', {}, 'This region has no hotspot data loaded, so there’s nowhere to place your birds yet. Switch regions from the pills, or build one from the county map.'));
      return;
    }
    for (const name of names) {
      const s = SPECIES.find((x) => x.name === name);
      if (!s) continue;
      yourList.append(infoCard(s, hotspots, nav));
    }
  }

  function infoCard(s, hotspots, nav) {
    const ranked = bestForSpecies(s, hotspots, { byPresence: true });
    const withPresence = ranked.filter((r) => r.best.value > 0.01);
    const node = el('div.tl-card', { class: isSeen(s.name) ? 'is-seen' : '' });
    node.append(starButton(s, () => { repaintYourList(); repaintList(); repaintSummary(); }));

    const main = el('div.tl-main');
    main.append(el('a.tl-name', {
      href: '#/species', title: `See ${s.name} in the planner`,
      onclick: (ev) => { ev.preventDefault(); state.speciesQuery = s.name; nav.go('#/species'); },
    }, s.name + (isSeen(s.name) ? ' · seen' : '')));

    if (!withPresence.length) {
      main.append(el('p.tl-where.dim', {}, 'Not expected at this region’s hotspots — try another region.'));
    } else {
      const top = withPresence[0];
      main.append(el('p.tl-where', {}, [
        'Best: ', el('strong', {}, top.hotspot.name), ' · peak ', el('strong', {}, MONTHS[top.best.monthIdx]),
        ` (${pct(top.best.value)}${top.best.inferred ? '*' : ''})`,
      ]));
      const others = withPresence.slice(1, 3).map((r) => r.hotspot.name);
      if (others.length) main.append(el('p.tl-more.dim', {}, `also ${others.join(', ')}`));
      main.append(sparkline(top.months, { inferred: top.best.inferred, w: 150 }));
    }
    node.append(main);
    return node;
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
    const node = el('div.tg-row', { class: [isTarget(s.name) ? 'on' : '', isSeen(s.name) ? 'is-seen' : ''].filter(Boolean).join(' ') }, [
      starButton(s, () => { node.classList.toggle('on', isTarget(s.name)); repaintYourList(); repaintSummary(); }),
      el('div.tg-row-main', {}, [
        el('span.tg-name', {}, s.name),
        el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
      ]),
      paMeter(s),
    ]);
    return node;
  }

  repaintSummary();
  repaintYourList();
  repaintList();
  root.append(summary);
  root.append(yourList);
  root.append(el('div.search-wrap', {}, search));
  root.append(el('p.dim.tg-hint', {}, 'Starring a bird is just information — it shows you where and when to find it, and never changes the hotspot ranking on its own. Flip “Rank hotspots by presence” to also sort spots by how often your birds appear (frequency only — photoability, how easy a bird is to shoot, is shown but never used here).'));
  root.append(listWrap);
}
