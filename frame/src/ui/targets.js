// =============================================================================
// TARGET BIRDS — the picker screen (#/targets), the standing presence-mode
// indicator, and a reusable star toggle. Starring is INFORMATIONAL: tap a star
// anywhere (here, a species page, a hotspot's matrix) and the bird joins your
// list, where the app tells you WHERE and WHEN to find it. One optional toggle —
// "rank by presence" — additionally sorts the hotspots by how often your targets
// appear; it announces itself with a standing bar and a non-destructive exit,
// per the product's taste rules.
// =============================================================================
import { el, clear, pct, sparkline, toast } from './dom.js';
import { SPECIES } from '../data/species.js';
import { HABITATS } from '../data/habitats.js';
import { MONTHS, STATUS_LABEL } from '../model/inference.js';
import { bestForSpecies } from '../model/scoring.js';
import { getHotspots, activeRegion } from '../model/regions.js';
import { isSeen } from '../model/seen.js';
import { facetsActive, applyFacetFilter } from '../model/facets.js';
import { facetFilterPanel, facetIconButton } from './facetbar.js';
import { speciesThumb } from './thumbs.js';
import {
  isTarget, toggleTarget, getTargets, targetCount, clearTargets, setTargets,
  targetsRankOn, setTargetsRank, targetsRankActive,
} from '../model/targets.js';

// A species' dominant habitat, for grouping the picker into browsable sections.
function primaryHabitat(s) {
  const entries = Object.entries(s.habitats || {});
  if (!entries.length) return { key: 'other', label: 'Other' };
  const [key] = entries.sort((a, b) => b[1] - a[1])[0];
  return { key, label: HABITATS[key]?.label || key };
}

// Which habitat sections are unfolded in the browse list. Stored on-device so a
// fold survives leaving and coming back (like every other Frame preference).
// DEFAULT is all-collapsed — the picker opens as a short, scannable index of
// habitats instead of one long scroll; tap a section to unfold its birds.
const FOLD_KEY = 'frame.targetGroupsOpen';
function openGroups() {
  try {
    const a = JSON.parse(localStorage.getItem(FOLD_KEY) || '[]');
    return new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []);
  } catch { return new Set(); }
}
function setGroupOpen(key, open) {
  const s = openGroups();
  if (open) s.add(key); else s.delete(key);
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...s])); } catch { /* private mode */ }
}

// Size + behaviour facet icons — each a tri-state filter you can tap to narrow
// the browse list below (and every ranked view) to birds like this one.
function sizeBehaviorIcons(s, onChange) {
  return el('span.sp-facets.sp-facets-labelled', {}, [
    facetIconButton('size', s.size, { size: 16, label: true, onChange }),
    facetIconButton('behavior', s.behavior, { size: 16, label: true, onChange }),
  ]);
}

/**
 * A star toggle for one species. `onToggle(nowTarget)` lets the caller update
 * its own surrounding UI (counts, banners) without a full re-render.
 */
// The target ("shot list") mark is a CAMERA — this is a photographer's want-list.
// Same body as the photo-first camera (ui/photo.js) so the app keeps one camera
// silhouette. OFF = outline; ON = filled with the lens knocked out (evenodd) so
// it reads as a solid, gold camera. Size comes from CSS.
const CAM_BODY = 'M4 8h3.2l1.9-2.5h5.8L16.8 8H20a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z';
export function cameraMark(on) {
  return on
    ? `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${CAM_BODY}M12 10.7a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${CAM_BODY}"/><circle cx="12" cy="13.4" r="3.1"/></svg>`;
}

export function starButton(s, onToggle) {
  const btn = el('button.star-btn', {
    'aria-label': isTarget(s.name) ? `Remove ${s.name} from your shot list` : `Add ${s.name} to your shot list`,
    title: isTarget(s.name) ? 'On your shot list — tap to remove' : 'Add to your shot list',
  });
  const paint = () => {
    const on = isTarget(s.name);
    btn.classList.toggle('on', on);
    btn.innerHTML = cameraMark(on);
    btn.title = on ? 'On your shot list — tap to remove' : 'Add to your shot list';
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
  bar.append(el('span.tb-mark', { 'aria-hidden': 'true', html: cameraMark(true) }));
  bar.append(el('span.tb-label', {}, [
    el('strong', {}, `Ranking by presence of your ${n} target bird${n === 1 ? '' : 's'}`),
    ' — how often they’re here.',
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

  // The Targets screen carries the SAME always-on filter as Ranking — the
  // facetFilterPanel accordion (Type / Size / Nest / Behaviour, tri-state) — so
  // the browse list below narrows the same way it does everywhere else. A facet
  // tap re-renders the screen (the search text is state-backed, so it's kept),
  // which rebuilds the panel with fresh green/red counts; the panel's own
  // status-lights row is the standing "what's filtered" indicator + Clear.
  const onFacetChange = () => nav.rerender();

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
        // Undoable — clearing a starred list should never be a one-way trip.
        onclick: () => {
          const wiped = getTargets();
          if (!wiped.length) return;
          clearTargets(); repaintYourList(); repaintList(); repaintSummary();
          toast(`Cleared ${wiped.length} target${wiped.length === 1 ? '' : 's'}.`, {
            action: { label: 'Undo', onClick: () => { setTargets(wiped); repaintYourList(); repaintList(); repaintSummary(); } },
          });
        },
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
    const ranked = bestForSpecies(s, hotspots);
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
    // Compose the text search with the tapped icon-filters: browsing narrows to
    // birds like the one you touched.
    const pool = facetsActive() ? applyFacetFilter(SPECIES) : SPECIES;
    const match = pool.filter((s) => !q || s.name.toLowerCase().includes(q));
    if (!match.length) {
      listWrap.append(el('p.dim', {}, facetsActive()
        ? 'No species match your icon filters (and search). Tap “Show all birds” above to widen.'
        : 'No species match that filter.'));
      return;
    }

    // When you're actively narrowing — typing a search or tapping a facet icon —
    // show the matches open and flat, never folded away behind a chevron. Only
    // the plain, full browse gets the collapsible habitat index.
    const narrowing = !!q || facetsActive();

    // Group by dominant habitat; within a group, commoner birds first, then
    // alphabetical. A live search flattens to a single "Matches" group so
    // results aren't buried.
    const groups = new Map();
    for (const s of match) {
      const g = q ? { key: 'matches', label: 'Matches' } : primaryHabitat(s);
      if (!groups.has(g.key)) groups.set(g.key, { label: g.label, items: [] });
      groups.get(g.key).items.push(s);
    }

    // A one-tap "expand all / collapse all" above the folded sections, so the
    // whole list is never more than a tap away and folding is easy to undo.
    if (!narrowing && groups.size > 1) listWrap.append(browseHeader([...groups.keys()]));

    for (const [key, { label, items }] of groups) {
      items.sort((a, b) => (b.abundance ?? 0) - (a.abundance ?? 0) || a.name.localeCompare(b.name));
      const body = el('div.tg-group-body', { id: `tg-body-${key}` });
      for (const s of items) body.append(row(s));
      if (narrowing) {
        listWrap.append(el('h2.tg-group', {}, label));
        listWrap.append(body);
      } else {
        const starred = items.filter((s) => isTarget(s.name)).length;
        const open = openGroups().has(key);
        listWrap.append(groupHead(key, label, items.length, starred, body));
        body.hidden = !open;
        listWrap.append(body);
      }
    }
  }

  // The "Browse by habitat" heading plus an expand-all / collapse-all button
  // (its label reflects the current state).
  function browseHeader(keys) {
    const allOpen = keys.every((k) => openGroups().has(k));
    return el('div.tg-browsehead', {}, [
      el('span.tg-browselabel', {}, 'Browse by habitat'),
      el('button.btn.ghost.small.tg-foldall', {
        onclick: () => { keys.forEach((k) => setGroupOpen(k, !allOpen)); repaintList(); },
      }, allOpen ? 'Collapse all' : 'Expand all'),
    ]);
  }

  // A folding section header: chevron · habitat name · species count · (if any
  // are already on your shot list) a small camera tally. Tapping folds just this
  // section — a light, always-reversible disclosure, not a mode.
  function groupHead(key, label, count, starred, body) {
    const open = openGroups().has(key);
    const chev = el('span.tg-fold-chev', { 'aria-hidden': 'true' }, open ? '▾' : '▸');
    const counts = el('span.tg-fold-counts', {}, [
      el('span.tg-fold-count', { title: `${count} species` }, String(count)),
      starred ? el('span.tg-fold-starred', {
        title: `${starred} on your shot list`,
        html: cameraMark(true) + `<b>${starred}</b>`,
      }) : null,
    ]);
    const head = el('button.tg-group.tg-fold' + (open ? '.open' : ''), {
      type: 'button',
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': `tg-body-${key}`,
      onclick: () => {
        const now = !head.classList.contains('open');
        setGroupOpen(key, now);
        head.classList.toggle('open', now);
        head.setAttribute('aria-expanded', now ? 'true' : 'false');
        chev.textContent = now ? '▾' : '▸';
        body.hidden = !now;
      },
    }, [chev, el('span.tg-fold-label', {}, label), counts]);
    return head;
  }

  function row(s) {
    const node = el('div.tg-row', { class: [isTarget(s.name) ? 'on' : '', isSeen(s.name) ? 'is-seen' : ''].filter(Boolean).join(' ') }, [
      starButton(s, () => { node.classList.toggle('on', isTarget(s.name)); repaintYourList(); repaintSummary(); }),
      el('div.tg-row-main', {}, [
        speciesThumb(s, 40),
        el('span.tg-name', {}, s.name),
        el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
      ]),
      sizeBehaviorIcons(s, onFacetChange),
    ]);
    return node;
  }

  repaintSummary();
  repaintYourList();
  repaintList();
  root.append(summary);
  root.append(yourList);
  root.append(el('h2.tg-group', {}, 'Filter the species list'));
  root.append(facetFilterPanel(nav));
  root.append(el('div.search-wrap', {}, search));
  root.append(el('p.dim.tg-hint', {}, 'Starring a bird is just information — it shows you where and when to find it, and never changes the hotspot ranking on its own. Flip “Rank hotspots by presence” to also sort spots by how often your birds appear.'));
  root.append(listWrap);
}
