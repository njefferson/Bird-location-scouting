// =============================================================================
// VIEWS — the four screens from §5: Cards, Matrix, Species search, Settings,
// plus a per-hotspot species matrix detail.
// =============================================================================
import { el, clear, pct, sparkline, toast } from './dom.js';
import { trustBadge, inferredChip, liveBadge, nBadge } from './badges.js';
import { openIconInfo } from './scoreinfo.js';
import { facetFilterPanel, facetBar, facetIconButton, guildBird } from './facetbar.js';
import { photoChip } from './photo.js';
import { SPECIES } from '../data/species.js';
import { GUILDS, GUILD_KEYS, speciesFacetIcons, facetSvg } from '../data/facets.js';
import { cycleFacet, facetState } from '../model/facets.js';
import { hotspotMapLinks } from '../data/hotspots.js';
import { HABITATS } from '../data/habitats.js';
import { freshness, monthYear } from '../model/freshness.js';
import { MONTHS, frequencySeries, frequency, seasonality, STATUS_LABEL } from '../model/inference.js';
import { rankHotspots, hotTierCount, FILTERS, bestForSpecies, TRUST } from '../model/scoring.js';
import { rankingSpec } from '../model/lists.js';
import { isTarget, targetCount, targetsRankOn, setTargetsRank, targetsRankActive } from '../model/targets.js';
import { isSeen, seenCount, newBirdsOn, setNewBirds, newBirdsActive } from '../model/seen.js';
import { starButton, cameraMark } from './targets.js';
import { seenButton } from './seen.js';
import { getHotspots, regionMeta, regions, savedRegions, canAddRegion, activeRegion, regionCenter } from '../model/regions.js';
import { autoSwitchEnabled, setAutoSwitch } from '../model/geo.js';
import { ebirdSettings, saveEbirdSettings, probe, nearestForSpecies } from '../model/ebird.js';
import { currentTheme, setTheme } from './theme.js';
import { photoFirstOn, setPhotoFirst, shootFactors, xw } from '../model/photo.js';

function daysAgo(obsDt) {
  if (!obsDt) return null;
  const d = new Date(obsDt.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  // Date.now() at call time, not module load — a PWA can stay open for days.
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

// A bird name that opens that species' page INSIDE the planner (the Species view).
function speciesLink(cls, s, state, nav) {
  return el(`a.bird-link${cls ? '.' + cls : ''}`, {
    href: '#/species',
    title: `See ${s.name} in the planner`,
    onclick: (ev) => { ev.preventDefault(); state.speciesQuery = s.name; nav.go('#/species'); },
  }, s.name);
}

// Filled check-circle for the "Birds I've seen" entry — a bird you've ticked off
// (the disc is currentColor/slate, the check knocked out via evenodd).
function seenMark() {
  return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM10.6 16.2 6.4 12 8 10.4 10.6 13 16 7.6 17.6 9.2Z"/></svg>';
}

// External link to a species' full eBird page (kept available from the Species view).
function ebirdLink(s) {
  return el('a.ebird-link', {
    href: `https://ebird.org/species/${s.code}`,
    target: '_blank', rel: 'noopener',
    title: `Open ${s.name} on eBird.org`,
  }, '↗ eBird');
}

// --- Shared controls --------------------------------------------------------
export function monthSelector(state, onChange) {
  const sel = el('div.months');
  MONTHS.forEach((m, i) => {
    sel.append(el('button.month', {
      class: i === state.monthIdx ? 'active' : '',
      onclick: () => onChange(i),
    }, m));
  });
  return sel;
}

function filterBar(state, onChange) {
  const bar = el('div.filters');
  const active = FILTERS[state.filter] || FILTERS.all;
  Object.values(FILTERS).forEach((f) => {
    bar.append(el('button.filter', {
      class: f.key === active.key ? 'active' : '',
      title: f.hint,
      onclick: () => onChange(f.key),
    }, f.label));
  });
  bar.append(el('div.filter-hint', {}, active.hint));
  return bar;
}

// "New for me" can empty the working species set (every target — or every
// curated bird — is already on the seen list). Zero species would render every
// hotspot as a silent 0; say what happened instead. The mode bars above keep
// their one-tap exits, so the way forward is already on screen.
export function emptyModeNote(spec) {
  if (spec.species.length) return null;
  let msg;
  if (spec.facetsMode) {
    msg = 'Your icon filters don’t leave any curated birds to count. Tap “Show all birds” on the filter bar, or open the filters and loosen them.';
  } else if (spec.targetsMode) {
    msg = 'Every one of your target birds is already on your seen list, so “New for me” leaves nothing to rank. Show all birds, turn off “New for me”, or star a bird you still need.';
  } else {
    msg = 'Every curated bird is on your seen list — congratulations! Turn off “New for me” to rank all birds again.';
  }
  return el('div.dead-end', {}, [
    el('h2', {}, 'Nothing left to count'),
    el('p.dim', {}, msg),
  ]);
}

// A region with no loaded hotspots is a dead end unless we point somewhere.
// Built-in regions can't be edited, so we send those to the picker; a saved
// region offers to edit its counties. Either way, an honest label + a button.
export function regionDeadEnd(nav, title) {
  const region = activeRegion();
  const editable = savedRegions().some((r) => r.id === region.id);
  // If we're offline and the region has counties that simply aren't cached yet,
  // say THAT — don't blame the region for "no data" when the real cause is no
  // network and no prior visit to cache it.
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false && region.counties.length > 0;
  return el('div.dead-end', {}, [
    el('h2', {}, offline ? 'This region isn’t downloaded yet' : title),
    el('p.dim', {}, offline
      ? `You’re offline and “${region.name}” hasn’t been cached on this device. Reconnect once to download it, then it works offline too. You can still switch to an already-loaded region with the pills above.`
      : editable
        ? `“${region.name}” has no built hotspot data. Edit its counties, or switch regions with the pills above.`
        : `“${region.name}” has no hotspots loaded. Switch regions with the pills above, or build your own from the county map.`),
    editable
      ? el('button.btn.primary', { onclick: () => nav.go(`#/regions/${encodeURIComponent(region.id)}`) }, 'Edit counties')
      : el('button.btn.primary', { onclick: () => nav.go('#/regions') }, 'Build a region'),
  ]);
}

// =============================================================================
// CARDS (default view)
// =============================================================================
export function renderCards(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('div.title-row', {}, [
      el('h1', {}, 'Frame'),
      el('span.subtitle', {}, `${photoFirstOn() && !targetsRankActive() ? 'Easiest shots first' : 'Where the birds are'} · ${MONTHS[state.monthIdx]}`),
    ]),
    monthSelector(state, (i) => nav.setMonth(i)),
    filterBar(state, (k) => nav.setFilter(k)),
    photoChip(nav),
    facetFilterPanel(nav),
  ]));

  // Dead-end guard: a region with no built hotspot data shouldn't leave the
  // user staring at a blank list — say what happened and offer a way forward.
  if (!getHotspots().length) {
    root.append(regionDeadEnd(nav, 'No hotspot data for this region'));
    return;
  }

  const spec = rankingSpec();
  const modeNote = emptyModeNote(spec);
  if (modeNote) { root.append(modeNote); return; }
  const ranked = rankHotspots(getHotspots(), state.monthIdx, { species: spec.species, weigh: spec.weigh });
  const rows = (FILTERS[state.filter] || FILTERS.all).apply(ranked);

  const list = el('div.cards');
  if (!rows.length) {
    list.append(el('p.empty', {}, 'No hotspots match this filter for this month.'));
  }
  // A full region (Home is ~760 hotspots) is far more cards than anyone scrolls,
  // and rebuilding them all on every tap-to-filter is what made the ranking feel
  // slow to resort. Render the top slice — this is a presence-ranked list, so the
  // spots that matter are at the top — and offer the rest behind one tap. The cap
  // only bites the "All" filter; the opportunity filters return far fewer.
  const CARD_CAP = 50;
  const shown = rows.slice(0, CARD_CAP);
  for (const r of shown) list.append(card(r, state, nav));
  if (rows.length > CARD_CAP) {
    const more = el('button.btn.show-more', {
      onclick: () => {
        for (const r of rows.slice(CARD_CAP)) list.insertBefore(card(r, state, nav), more);
        more.remove();
      },
    }, `Show all ${rows.length} hotspots`);
    list.append(more);
  }
  root.append(list);
  root.append(dataProvenanceFooter());
}

function card(r, state, nav) {
  const h = r.hotspot;
  const top = r.contributions.slice(0, 3);

  // Live badge: most-recent of this card's top species, if the overlay has it.
  let live = null;
  if (state.recent) {
    const ds = top.map((c) => state.recent[c.species.code]).filter(Boolean).map(daysAgo).filter((x) => x != null);
    if (ds.length) live = liveBadge(Math.min(...ds));
  }

  // "N birds likely" — how many species clear the 5%-of-checklists bar this
  // month. Tap it for what the icons mean.
  const divChip = el('button.div-chip', {
    title: `${r.diversity} species clear 5% of checklists in ${MONTHS[state.monthIdx]} — tap for how the icons work`,
    'aria-label': `${r.diversity} species likely — tap for what the icons mean`,
    onclick: () => openIconInfo(r, MONTHS[state.monthIdx]),
  }, [`${r.diversity} bird${r.diversity === 1 ? '' : 's'} likely`, el('span.score-q', { 'aria-hidden': 'true' }, '?')]);

  const head = el('div.card-head', {}, [
    el('div.card-head-main', {}, [
      el('h2', {}, h.name),
      el('div.tags', {}, [
        trustBadge(r.trust),
        nBadge(r.n),
        divChip,
        inferredChip(r.inferredCount),
        live,
      ]),
    ]),
  ]);

  // Which KINDS of birds are here this month (info only — the filter is up top).
  const guildRow = guildPresenceRow(h, state.monthIdx);

  const habs = el('div.habs', {}, (h.habitats || []).map((k) => el('span.hab', { title: HABITATS[k]?.blurb }, HABITATS[k]?.label || k)));

  const species = el('div.top-species', {}, top.length
    ? top.map((c) => el('div.tsp', { class: isSeen(c.species.name) ? 'is-seen' : '' }, [
        speciesLink('tsp-name', c.species, state, nav),
        el('span.tsp-freq', { title: c.freq.rule }, pct(c.freq.value) + (c.freq.inferred ? '*' : '')),
        el('span.tsp-bar', {}, el('i', { style: `width:${Math.round(c.freq.value * 100)}%` })),
      ]))
    : el('span.dim', {}, 'No birds notably present this month.'));

  const links = hotspotMapLinks(h);
  const actions = el('div.card-actions', {}, [
    el('a.btn', { href: links.apple, target: '_blank', rel: 'noopener', title: `Open ${h.name} in Apple Maps` }, 'Apple Maps'),
    el('a.btn', { href: links.google, target: '_blank', rel: 'noopener', title: `Open ${h.name} in Google Maps` }, 'Google Maps'),
    el('button.btn', { onclick: () => nav.go(`#/hotspot/${h.id}`) }, 'Species matrix'),
    // The Access button appears ONLY where a real curated note exists (the ~60
    // seed hotspots). The data-built hotspots have no note and there's no honest
    // source to fill one, so we don't offer a button that promises nothing —
    // the Maps buttons cover getting there. (Roadmap "access notes: fill/drop".)
    h.access ? el('button.btn.ghost', { onclick: () => toggleNotes(card, h) }, 'Access') : null,
  ]);

  const node = el('div.card', {}, [head, guildRow, habs, species, actions]);
  node._hotspot = h;
  return node;
}

// Brightness thresholds for a guild's summed frequency at a hotspot this month.
const GUILD_LOTS = 0.5;   // ≥ one of these on ~every other checklist
const GUILD_SOME = 0.05;  // ≥ one on ~1 in 20 checklists

/** Summed frequency per guild (over ALL species) + whether any is real eBird.
 * Pure in (hotspot, monthIdx) but computed once per card — and the whole card
 * list rebuilds on every facet tap. Memoized per hotspot object (WeakMap ⇒
 * auto-dropped when a region switch swaps in fresh hotspot objects). Callers
 * only read the maps, never mutate them. */
const _guildPresenceCache = new WeakMap();
function guildPresence(h, monthIdx) {
  let byMonth = _guildPresenceCache.get(h);
  if (!byMonth) { byMonth = new Array(12); _guildPresenceCache.set(h, byMonth); }
  let entry = byMonth[monthIdx];
  if (!entry) {
    const sums = {}, realN = {};
    for (const s of SPECIES) {
      const f = frequency(s, h, monthIdx);
      if (f.value <= 0) continue;
      sums[s.guild] = (sums[s.guild] || 0) + f.value;
      if (!f.inferred) realN[s.guild] = (realN[s.guild] || 0) + 1;
    }
    entry = byMonth[monthIdx] = { sums, realN };
  }
  return entry;
}

/**
 * The tri-state guild icon row for a card / hotspot header. Each icon shows
 * this month's presence (none/some/lots), dashes when it's modeled-only, and
 * carries the guild's filter state (wanted ✓ / excluded ✕). Tapping cycles the
 * filter and re-renders.
 */
// The per-hotspot presence row: which KINDS of birds are here THIS month, purely
// informational (NOT the filter — that lives in the always-on panel up top). All
// 12 guilds show in a fixed order for quick recognition; the icon itself carries
// the state — lit ("here"/lots), dimmed ("maybe"/some), or wearing a small ✕
// ("not expected"/none). Deliberately uses no ✓/✗ or ring/slash, so it never
// reads as the tappable filter that shares these glyphs.
function guildPresenceRow(h, monthIdx) {
  const { sums, realN } = guildPresence(h, monthIdx);
  const icons = el('div.presence-icons', { role: 'group', 'aria-label': `Bird groups at ${h.name} in ${MONTHS[monthIdx]}` });
  for (const key of GUILD_KEYS) {
    const g = sums[key] || 0;
    const level = g >= GUILD_LOTS ? 'lots' : g >= GUILD_SOME ? 'some' : 'none';
    const inferred = level !== 'none' && !realN[key];
    const gu = GUILDS[key];
    const where = level === 'lots' ? 'lots here' : level === 'some' ? 'some here' : 'not expected';
    // Summed report rates = expected species of this group on one visit — never
    // print the sum as a "%" (a rich group's sum runs far past 1).
    const amount = g > 0 ? ` (≈${g >= 10 ? Math.round(g) : g.toFixed(1)}/visit${inferred ? ', modeled' : ''})` : '';
    const cell = el('span.pi', {
      class: [`pi-${level}`, inferred ? 'pi-modeled' : ''].filter(Boolean).join(' '),
      title: `${gu.label} — ${where} in ${MONTHS[monthIdx]}${amount}`,
      'aria-label': `${gu.label}: ${where}`,
    }, [el('span.pi-glyph', { 'aria-hidden': 'true', html: facetSvg(gu.icon, 20) })]);
    icons.append(cell);
  }
  return el('div.presence-row', {}, [
    el('span.presence-label', {}, 'Here this month'),
    icons,
  ]);
}

function toggleNotes(_, h) {
  // Expandable curated access note. Only wired up when h.access exists (see the
  // Access button guard), so there's no "no note yet" placeholder to show.
  const existing = document.querySelector(`.card-notes[data-h="${h.id}"]`);
  if (existing) { existing.remove(); return; }
  const all = [...document.querySelectorAll('.card')].find((c) => c._hotspot === h);
  if (all && h.access) all.append(el('div.card-notes', { dataset: { h: h.id } }, h.access));
}

function dataProvenanceFooter() {
  const meta = regionMeta();
  let msg = meta.loaded
    ? `${meta.region} region · ${meta.hotspots} hotspots across ${meta.counties} county file(s) · eBird histogram data built ${meta.builtAt || '(date n/a)'}. * = a value still on the habitat/season model.`
    : 'No region data loaded yet — every frequency is the transparent habitat/season model (marked *).';
  // Loud, honest failure: county data without species codes zeroes every score.
  if (meta.loaded && !meta.taxonomy) msg += ' ⚠ data/taxonomy.json failed to load — species codes are missing, so scores read 0. Run the Refresh eBird data action.';
  return el('footer.provenance', {}, [el('strong', {}, 'Data: '), msg]);
}

// =============================================================================
// MATRIX — hotspot × month heatmap of HotspotScore (§5)
// =============================================================================
export function renderMatrix(root, state, nav) {
  clear(root);
  // Which number fills the cells: 'species' (how many species clear the keeper
  // bar) or 'reports' (eBird checklists in the loaded data — the sample size
  // behind the rankings, Noah's "numbers behind the dots"; the map's ⓘ jumps
  // here with this mode on). One surface, not a separate popup — this IS the
  // site × month table, so the numbers live in it.
  const numMode = state.plannerNumbers === 'reports' ? 'reports' : 'species';
  root.append(el('header.bar', {}, [
    el('h1', {}, 'Year planner'),
    el('span.subtitle', {}, numMode === 'reports'
      ? 'Reports in the data by month · orange = historically strongest spots — tap a month name to sort, a cell for detail.'
      : 'Species likely by month · orange = historically strongest spots for that month — tap a month name to sort, a cell for detail.'),
  ]));

  // Pre-rank each month; each month's HOT tier (the natural break in that
  // month's ranking, hotTierCount) is the only colour distinction — a cell is
  // either one of the month's standout spots or it's a plain cell.
  const spec = rankingSpec();
  const modeNote = emptyModeNote(spec);
  if (modeNote) { root.append(modeNote); return; }
  const byMonth = MONTHS.map((_, m) => {
    const ranked = rankHotspots(getHotspots(), m, { species: spec.species, weigh: spec.weigh });
    return {
      rows: Object.fromEntries(ranked.map((r) => [r.hotspot.id, r])),
      hot: new Set(ranked.slice(0, hotTierCount(ranked)).map((r) => r.hotspot.id)),
    };
  });
  const cellNum = (h, m) => {
    const r = byMonth[m].rows[h.id];
    return numMode === 'reports' ? r.n : r.diversity;
  };

  // The standing numbers toggle — the mode announces itself and swaps in a tap.
  root.append(el('div.num-toggle', { role: 'group', 'aria-label': 'What the cell numbers show' }, [
    ['species', 'Species likely'], ['reports', 'Reports'],
  ].map(([key, label]) => el('button.num-btn' + (numMode === key ? '.on' : ''), {
    'aria-pressed': numMode === key ? 'true' : 'false',
    onclick: () => { state.plannerNumbers = key; nav.rerender(); },
  }, label))));

  const sortM = Number.isInteger(state.plannerSort) ? state.plannerSort : null;
  const table = el('table.matrix');
  // Sort controls are real buttons inside the th cells so the keyboard reaches
  // them (Tab + Enter), with the global focus ring (/ACCESSIBILITY.md A7).
  const head = el('tr', {}, [
    el('th.corner', {}, el('button.th-btn', {
      title: 'Back to the default order (best month first)',
      onclick: () => { state.plannerSort = null; nav.rerender(); },
    }, 'Hotspot')),
    ...MONTHS.map((m, i) => el('th.mth', {
      class: [i === state.monthIdx ? 'col-active' : '', i === sortM ? 'sorted' : ''].filter(Boolean).join(' '),
    }, el('button.th-btn', {
      title: `Sort by ${m}`,
      'aria-pressed': i === sortM ? 'true' : 'false',
      onclick: () => { state.plannerSort = sortM === i ? null : i; nav.rerender(); },
    }, m))),
  ]);
  table.append(head);

  // Row order: tap a month to sort by that column's number; otherwise by the
  // best month's presence intensity.
  const order = getHotspots().map((h) => ({ h, best: Math.max(...byMonth.map((mm) => mm.rows[h.id].vis)) }))
    .sort(sortM == null
      ? (a, b) => b.best - a.best
      : (a, b) => (cellNum(b.h, sortM) ?? -1) - (cellNum(a.h, sortM) ?? -1) || b.best - a.best);

  const buildMatrixRow = (h) => {
    const tr = el('tr', {}, [el('th.rowhead', {},
      el('button.th-btn', { onclick: () => nav.go(`#/hotspot/${h.id}`) }, h.name))]);
    MONTHS.forEach((_, m) => {
      const r = byMonth[m].rows[h.id];
      const hot = byMonth[m].hot.has(h.id);
      const n = cellNum(h, m);
      const cell = el('td.cell', {
        class: [m === state.monthIdx ? 'col-active' : '', hot ? 'hot' : ''].filter(Boolean).join(' '),
        title: `${h.name} · ${MONTHS[m]} · ${r.diversity} species likely · ${r.n ?? '—'} reports · ${r.trust.label}${hot ? ` · historically strong for ${MONTHS[m]}` : ''}`,
        onclick: () => { nav.setMonth(m); nav.go(`#/hotspot/${h.id}`); },
      }, n == null ? '—' : String(n));
      tr.append(cell);
    });
    return tr;
  };
  // Same cap as the ranking cards: a full region is ~760 rows × 12 cells, which
  // is slow to build on every month change. Top rows (by peak presence) first,
  // rest one tap away.
  const ROW_CAP = 50;
  for (const { h } of order.slice(0, ROW_CAP)) table.append(buildMatrixRow(h));
  root.append(el('div.matrix-wrap', {}, table));
  if (order.length > ROW_CAP) {
    root.append(el('button.btn.show-more', {
      onclick: (ev) => { for (const { h } of order.slice(ROW_CAP)) table.append(buildMatrixRow(h)); ev.target.remove(); },
    }, `Show all ${order.length} hotspots`));
  }
  // Honest label: past-seasons frequency, not live activity (see mapview). In
  // reports mode, say what the sample is and that it tracks every data refresh.
  const built = (() => {
    const d = new Date(regionMeta().builtAt || NaN);
    return Number.isNaN(d.getTime()) ? null : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  })();
  root.append(el('p.legend', {}, numMode === 'reports'
    ? `Each number is how many reports (eBird checklists) the loaded data holds for that site in that calendar month — the sample behind the rankings. Months differ hugely: a top spot can rest on hundreds of reports in one month and a dozen in another, and the orange alone can’t show that. Computed from the data itself, so it updates with every refresh${built ? ` (current data built ${built})` : ''}. Orange cells are that month’s historically strongest tier — the same spots as the map’s orange pins.`
    : spec.weigh
      ? 'An orange cell means that hotspot has historically reported the most shootable birds in that month (past seasons’ Σ frequency × photo weight, discounted for thin coverage — not live sightings); each month is judged on its own. The number is how many species clear 5% of checklists — a plain count, never weighted. Tap a cell for that month’s detail.'
      : 'An orange cell means that hotspot has historically reported the most birds in that month (past seasons’ Σ frequency, discounted for thin coverage — not live sightings); each month is judged on its own. The number is how many species clear 5% of checklists. Tap a cell for that month’s detail.'));
}

// =============================================================================
// HOTSPOT DETAIL — full species × month matrix for one hotspot (§4)
// =============================================================================
export function renderHotspotDetail(root, state, nav, hotspotId) {
  clear(root);
  const h = getHotspots().find((x) => x.id === hotspotId);
  if (!h) { root.append(el('p.empty', {}, 'Unknown hotspot.')); return; }

  const spec = rankingSpec();
  const ranked = rankHotspots(getHotspots(), state.monthIdx, { species: spec.species, weigh: spec.weigh }).find((r) => r.hotspot.id === h.id);

  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'),
    el('div.title-row', {}, [el('h1', {}, h.name),
      el('button.score-inline', {
        title: 'What do the icons mean?',
        'aria-label': `${MONTHS[state.monthIdx]}: ${ranked.diversity} species likely — tap for what the icons mean`,
        onclick: () => openIconInfo(ranked, MONTHS[state.monthIdx]),
      }, [`${MONTHS[state.monthIdx]} · ${ranked.diversity} species likely`, el('span.score-q', { 'aria-hidden': 'true' }, '?')]),
      trustBadge(ranked.trust), nBadge(ranked.n)]),
    guildPresenceRow(h, state.monthIdx),
    monthSelector(state, (i) => nav.setMonth(i)),
  ]));

  const links = hotspotMapLinks(h);
  // The curated "Access:" note shows only when one actually exists; the Maps
  // links are always here (that's how you get there). No empty-promise line.
  root.append(el('div.access-box', {}, [
    h.access ? el('p.access-note', {}, [el('strong', {}, 'Access: '), h.access]) : null,
    el('div.access-links', {}, [
      el('a.btn', { href: links.apple, target: '_blank', rel: 'noopener' }, 'Apple Maps'),
      el('a.btn', { href: links.google, target: '_blank', rel: 'noopener' }, 'Google Maps'),
    ]),
  ]));

  // Species table: name · facet icons · this-month freq · sparkline. Sorted by
  // how present the bird is here this month.
  const rows = SPECIES.map((s) => {
    const series = frequencySeries(s, h);
    const fNow = series[state.monthIdx];
    return { s, series, fNow };
  }).filter((r) => r.series.some((f) => f.value > 0.01))
    .sort((a, b) => b.fNow.value - a.fNow.value);

  const table = el('table.species-table');
  table.append(el('tr', {}, ['', 'Species', 'Facets', `${MONTHS[state.monthIdx]} freq`, '12-mo'].map((t) => el('th', {}, t))));
  // Build one species row. A busy hotspot lists 100+ present species and each
  // row carries a sparkline + facet buttons; rebuilding them all on every
  // tap-to-filter is what made the matrix slow to resort. So cap the table and
  // reveal the tail on demand — the rows that matter are at the top (sorted by
  // this month's presence).
  const buildRow = (r) => {
    const inferredNow = r.fNow.inferred;
    const paint = () => {
      tr.classList.toggle('is-target', isTarget(r.s.name));
      tr.classList.toggle('is-seen', isSeen(r.s.name));
    };
    const tr = el('tr', { class: [isTarget(r.s.name) ? 'is-target' : '', isSeen(r.s.name) ? 'is-seen' : ''].filter(Boolean).join(' ') }, [
      el('td.mark-cell', {}, [starButton(r.s, paint), seenButton(r.s, paint)]),
      el('td.name-cell', {}, [speciesLink('', r.s, state, nav), inferredNow ? el('span.star', { title: r.fNow.rule }, ' *') : null]),
      el('td', {}, speciesFacetRow(r.s)),
      el('td.freq-cell', { title: r.fNow.rule }, pct(r.fNow.value)),
      el('td', {}, sparkline(r.series, { inferred: inferredNow })),
    ]);
    return tr;
  };
  const ROW_CAP = 40;
  for (const r of rows.slice(0, ROW_CAP)) table.append(buildRow(r));
  const tableWrap = el('div.table-wrap', {}, table);
  root.append(tableWrap);
  if (rows.length > ROW_CAP) {
    const more = el('button.btn.show-more', {
      onclick: () => { for (const r of rows.slice(ROW_CAP)) table.append(buildRow(r)); more.remove(); },
    }, `Show all ${rows.length} species`);
    root.append(more);
  }
  root.append(el('p.legend', {}, [
    el('span.leg-ico', { 'aria-hidden': 'true', html: cameraMark(true) }),
    ' = your shot list (see where & when to find it). ✓ = seen (dimmed here, kept in every count). * = inferred from the habitat/season model (hover for the rule). Facet icons are type · size · nest · behaviour — behavioural likelihood, not promises.',
    spec.targetsMode ? el('span', {}, ' The count above uses only your target birds.') : null,
    spec.newMode ? el('span', {}, ' The count above counts only birds you haven’t got yet.') : null,
    spec.facetsMode ? el('span', {}, ' The count above uses only birds matching your icon filters.') : null,
  ]));
}

// In the species table the facets are just information — a short italic
// parenthetical line (type · size · nest · behaviour), lighter than the species
// name, so the table stays short. Tap-to-filter lives on the card guild row, the
// picker, the species page and the Target/Seen rows, not here.
function speciesFacetRow(s) {
  const parts = speciesFacetIcons(s).map((fi) =>
    fi.facet === 'guild' ? (GUILDS[fi.key]?.short || fi.label) : fi.label);
  return el('span.sp-facet-line', {}, [
    guildBird(s),
    el('span.sp-facet-note', {}, parts.length ? `(${parts.join(' · ')})` : ''),
  ]);
}

// =============================================================================
// SPECIES SEARCH — where + when to photograph a species (§5)
// =============================================================================
export function renderSpecies(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('h1', {}, 'Find a species'),
    el('span.subtitle', {}, 'Where in your region, and which month, to photograph one bird.'),
  ]));

  // Target-birds entry: add birds to your shot list to see where & when.
  const n = targetCount();
  root.append(el('button.tg-entry', { onclick: () => nav.go('#/targets') }, [
    el('span.tg-entry-mark', { 'aria-hidden': 'true', html: cameraMark(true) }),
    el('span.tg-entry-main', {}, [
      el('strong', {}, n ? `Your ${n} target bird${n === 1 ? '' : 's'}` : 'Pick your target birds'),
      el('span.dim', {}, n
        ? (targetsRankActive() ? 'ranking spots by their presence — tap to edit' : 'tap to see where & when, or edit')
        : 'pick the birds you want to photograph — see where and when to find each one'),
    ]),
    el('span.tg-entry-go', { 'aria-hidden': 'true' }, '›'),
  ]));

  // Seen / life-list entry: track what you've got, focus on what's new. The mark
  // is a check — a bird you've already got, ticked off (parallels the seen ✓).
  const sn = seenCount();
  root.append(el('button.tg-entry.seen-entry', { onclick: () => nav.go('#/seen') }, [
    el('span.tg-entry-mark', { 'aria-hidden': 'true', html: seenMark() }),
    el('span.tg-entry-main', {}, [
      el('strong', {}, sn ? `${sn} bird${sn === 1 ? '' : 's'} on your life list` : 'Birds I’ve seen'),
      el('span.dim', {}, sn
        ? (newBirdsActive() ? '“New for me” on — tap to edit' : 'tap to edit, or turn on “New for me”')
        : 'track what you’ve photographed and focus on the birds you still need'),
    ]),
    el('span.tg-entry-go', { 'aria-hidden': 'true' }, '›'),
  ]));

  // Standing filter bar: this screen isn't a ranked view, so main.js doesn't
  // prepend one — but tapping a facet chip below sets a filter, and a mode must
  // always announce itself with a one-tap exit. Managed locally so a tap only
  // repaints the bar + the panel (never the whole app / any typed input).
  const facetSlot = el('div.facet-slot');
  const onFacetChange = () => { repaintFacetBar(); run(); };
  function repaintFacetBar() {
    const bar = facetBar(state, nav, onFacetChange);
    facetSlot.replaceChildren(...(bar ? [bar] : []));
  }
  root.append(facetSlot);

  // A real in-app combobox — NOT a native <datalist>, which on iOS pops its own
  // picker instead of the keyboard, then won't reopen or let you edit (the bug
  // Noah hit). Tapping the field shows a scrollable list you can pick from AND
  // the keyboard to type; typing filters the list live; picking one opens that
  // species; you can always edit or clear and the list comes back.
  const input = el('input.search', {
    type: 'search', placeholder: 'Search or pick a species (e.g. Wood Duck)…',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'words', spellcheck: 'false',
    value: state.speciesQuery || '',
  });
  const sugg = el('div.sp-suggest', { hidden: true });
  const results = el('div.species-results');

  // Matches: names that START with the query first, then names that merely
  // contain it; an empty query lists everything so a tap = browse the whole list.
  function matches(q) {
    q = q.trim().toLowerCase();
    if (!q) return SPECIES;
    const starts = [], has = [];
    for (const s of SPECIES) {
      const n = s.name.toLowerCase();
      if (n.startsWith(q)) starts.push(s);
      else if (n.includes(q)) has.push(s);
    }
    return [...starts, ...has];
  }

  function paintSuggest() {
    clear(sugg);
    const q = input.value.trim().toLowerCase();
    // If the text is already an exact name, the panel's showing it — no list.
    if (SPECIES.some((s) => s.name.toLowerCase() === q)) { sugg.hidden = true; return; }
    const ms = matches(q).slice(0, 60);
    if (!ms.length) { sugg.hidden = true; return; }
    for (const s of ms) {
      sugg.append(el('button.sp-suggest-row', {
        onclick: () => { input.value = s.name; sugg.hidden = true; run(); },
      }, s.name));
    }
    sugg.hidden = false;
  }

  function run() {
    state.speciesQuery = input.value;
    clear(results);
    const q = input.value.trim().toLowerCase();
    // The detail panel shows once the text names a species exactly (typed in full
    // or picked from the list). Partial text just keeps the list open.
    const s = SPECIES.find((x) => x.name.toLowerCase() === q);
    if (!s) {
      results.append(el('p.dim', {}, q
        ? 'Keep typing, or pick a species from the list.'
        : 'Type a name, or tap the box to pick from the list.'));
      return;
    }
    results.append(speciesPanel(s, state, nav, onFacetChange));
  }

  input.addEventListener('focus', paintSuggest);
  input.addEventListener('input', () => { paintSuggest(); run(); });
  // Close the list when focus leaves — but after a tick, so a tap on a row lands.
  input.addEventListener('blur', () => setTimeout(() => { sugg.hidden = true; }, 160));

  root.append(el('div.search-wrap.sp-search', {}, [input, sugg]));
  root.append(results);
  repaintFacetBar();
  run();
}

function speciesPanel(s, state, nav, onFacetChange) {
  const panel = el('div.sp-panel', { class: isSeen(s.name) ? 'is-seen' : '' });
  const head = el('div.sp-head', {}, [
    starButton(s),
    seenButton(s, () => panel.classList.toggle('is-seen', isSeen(s.name))),
    el('h2', {}, s.name),
    el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
    ebirdLink(s),
  ]);
  panel.append(head);
  // Facet chips: type · size · nest · behaviour — each a tri-state filter you
  // can tap to narrow every ranked view (the standing bar above shows the exit).
  panel.append(el('div.sp-facet-chips', {}, speciesFacetIcons(s).map((fi) =>
    facetIconButton(fi.facet, fi.key, { size: 18, label: true, onChange: onFacetChange }))));
  if (photoFirstOn() && !targetsRankActive()) {
    const f = shootFactors(s);
    panel.append(el('p.sp-photo.dim', {}, `Photo-first ranking counts ${xw(f.w)} of its frequency (${f.behavior.label} ${xw(f.behavior.w)} · ${f.size.label} ${xw(f.size.w)}).`));
  }
  panel.append(el('p.sp-note', {}, s.note));

  const ranked = bestForSpecies(s, getHotspots());
  const best = ranked[0];
  if (best && best.best.value > 0) {
    panel.append(el('p.sp-best', {}, [
      'Best bet: ', el('strong', {}, best.hotspot.name), ' in ', el('strong', {}, MONTHS[best.best.monthIdx]),
      ` (${pct(best.best.value)} freq${best.best.inferred ? '*' : ''}).`,
    ]));
  }

  // Per-hotspot best month table.
  const table = el('table.species-table');
  table.append(el('tr', {}, ['Hotspot', 'Best month', 'Freq', '12-mo'].map((t) => el('th', {}, t))));
  for (const r of ranked) {
    if (r.best.value <= 0.001) continue;
    table.append(el('tr', { onclick: () => { state.monthIdx = r.best.monthIdx; nav.go(`#/hotspot/${r.hotspot.id}`); } }, [
      el('td', {}, r.hotspot.name),
      el('td', {}, MONTHS[r.best.monthIdx]),
      el('td', { title: r.best.rule }, pct(r.best.value) + (r.best.inferred ? '*' : '')),
      el('td', {}, sparkline(r.months, { inferred: r.best.inferred })),
    ]));
  }
  panel.append(el('div.table-wrap', {}, table));

  // Live "nearest recent" via the overlay (graceful). Debounced: the panel is
  // rebuilt on every keystroke, so wait a beat and only fetch if this panel is
  // still the one on screen — otherwise typing a name fires a call per letter.
  const liveLine = el('p.sp-live.dim', {}, 'Checking live eBird sightings…');
  panel.append(liveLine);
  setTimeout(() => {
    if (!liveLine.isConnected) return; // superseded by a newer render
    nearestForSpecies(s.code, { ...(regionCenter() || {}) }).then((obs) => {
      if (!obs || !obs.length) { liveLine.textContent = 'No live eBird sighting nearby (or overlay disabled).'; return; }
      const o = obs[0];
      liveLine.classList.remove('dim');
      clear(liveLine);
      liveLine.append('Live: last reported at ', el('strong', {}, o.locName || o.subId || 'a nearby spot'),
        o.obsDt ? ` (${daysAgo(o.obsDt)}d ago)` : '', '.');
    });
  }, 300);

  panel.append(el('p.legend', {}, '* inferred from the habitat/season model. Live row uses the eBird recent-obs API.'));
  return panel;
}

// =============================================================================
// SETTINGS — regions (with their data provenance) + the live eBird overlay.
// The old "box" section is gone: regions define coverage now; the box survives
// only as the build-script seed and the overlay's fallback center.
// =============================================================================
export function renderSettings(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'), el('h1', {}, 'Settings')]));

  const e = ebirdSettings();
  const form = el('div.settings');

  // --- Regions + their data (v14/v16) ---------------------------------------
  const saved = savedRegions();
  const activeId = activeRegion().id;
  const regionRows = regions().map((r) => {
    const isSaved = saved.some((s) => s.id === r.id);
    const nCounty = r.counties.length;
    return el('div.region-row', {}, [
      el('div.region-row-main', {}, [
        el('strong', {}, r.name),
        r.id === activeId ? el('span.chip', {}, 'active') : null,
        el('span.dim', {}, ` ${nCounty} count${nCounty === 1 ? 'y' : 'ies'}`),
      ]),
      el('div.region-row-actions', {}, [
        el('button.btn.ghost.small', { onclick: (ev) => shareRegion(r, ev.target) }, 'Share'),
        isSaved
          ? el('button.btn.ghost.small', { onclick: () => nav.go(`#/regions/${encodeURIComponent(r.id)}`) }, 'Edit')
          : el('span.dim.small', {}, 'built-in'),
      ]),
    ]);
  });
  const meta = regionMeta();
  form.append(section('Regions', [
    el('p.dim', {}, 'Switch regions from the pills at the top. Built-in regions can’t be changed; your own saved regions (up to 3) can be edited or deleted here.'),
    el('div.region-rows', {}, regionRows),
    canAddRegion()
      ? el('button.btn.primary', { onclick: () => nav.go('#/regions') }, '+ New region from map')
      : el('p.dim', {}, 'You’ve saved the maximum of 3 regions — edit or delete one to add another.'),
    (() => {
      const autoCb = checkbox(autoSwitchEnabled(), (v) => { setAutoSwitch(v); if (v) requestAutoSwitchPermission(autoCb); });
      return el('label.row', {}, [
        el('span', {}, 'Auto-switch region by location'),
        autoCb,
      ]);
    })(),
    el('p.dim', {}, 'When on, the app checks which of your regions you’re standing in each time it opens and switches to it (asks the browser for location permission once). Share sends a region as a link — opening it on another device imports the counties.'),
    el('p.dim', {}, meta.loaded
      ? `${meta.region}: ${meta.hotspots} hotspots across ${meta.counties} county file(s), eBird histogram data built ${meta.builtAt || '(date n/a)'} · ${meta.taxonomy} species with resolved eBird codes. Data refreshes quarterly via the “Refresh eBird data” GitHub Action.`
      : 'No region data loaded — running on the inference model.'),
    // Honest-aging note: what the app does if the quarterly refresh ever stops.
    (() => {
      if (!meta.loaded || !meta.builtAt) return null;
      const f = freshness(meta.builtAt);
      const asOf = monthYear(meta.builtAt) || meta.builtAt;
      const line = f.tier === 'fresh'
        ? `Data is current as of ${asOf}. This is seasonal frequency — which birds appear in which months — so it stays a reliable guide for a long time. If a refresh is ever missed for many quarters, Frame says so plainly at the top of the screen rather than pretending to be fresh.`
        : f.tier === 'archived'
          ? `This data is a snapshot from ${asOf} and Frame is running as an archive. Seasonal patterns hold up well, so it remains useful — treat specific numbers as historical.`
          : `This data hasn’t refreshed since ${asOf}. Seasonal patterns are stable, so it’s still a good guide, just older than the usual quarterly update.`;
      return el('p.dim', {}, line);
    })(),
  ]));

  // --- Photo-first ranking (v24 — the app's default posture) ----------------
  form.append(section('Photo-first ranking', [
    el('label.row', {}, [
      el('span', {}, 'Rank easiest shots first'),
      checkbox(photoFirstOn(), (v) => { setPhotoFirst(v); nav.rerender(); }),
    ]),
    el('p.dim', {}, 'On (the default), each bird’s eBird frequency is weighted by how shootable that kind of bird is — in the open ×1, in-and-out ×0.6, skulker ×0.25, and by size from tiny ×0.5 up to large ×1 — so hotspots rank by photographic opportunity, not raw bird counts. The weights come only from each bird’s published facet icons; tap the camera chip on the Ranking screen for the full tables. Off, every bird counts equally. Displayed numbers are never changed either way — only the order.'),
  ]));

  // --- Target birds ---------------------------------------------------------
  const tn = targetCount();
  form.append(section('Target birds', [
    el('p.dim', {}, 'Star the birds you want to photograph and the app shows you where and when to find each one. Starring is just information — it never changes the hotspot ranking on its own.'),
    el('button.btn.primary', { onclick: () => nav.go('#/targets') }, tn ? `Edit target birds (${tn})` : 'Choose target birds'),
    tn ? el('label.row', {}, [
      el('span', {}, 'Rank hotspots by target presence'),
      checkbox(targetsRankOn(), (v) => setTargetsRank(v)),
    ]) : null,
    tn ? el('p.dim', {}, 'Optional: sort the hotspots by how often your targets are reported there. Turn off to rank all birds again; your list is untouched.') : null,
  ]));

  // --- Birds I've seen (life list) ------------------------------------------
  const sn = seenCount();
  form.append(section('Birds I’ve seen', [
    el('p.dim', {}, 'Keep a life list of the birds you’ve already got. Seen birds stay visible everywhere (just dimmed) and still count toward every hotspot’s score — they’re set aside only in “New for me” mode.'),
    el('button.btn.primary', { onclick: () => nav.go('#/seen') }, sn ? `Edit life list (${sn})` : 'Track birds I’ve seen'),
    sn ? el('label.row', {}, [
      el('span', {}, '“New for me” mode'),
      checkbox(newBirdsOn(), (v) => setNewBirds(v)),
    ]) : null,
    sn ? el('p.dim', {}, 'Optional: re-rank the hotspots counting only the birds you haven’t got yet. Turn off any time; your list is untouched.') : null,
  ]));

  const themeToggle = checkbox(currentTheme() === 'dark', (v) => setTheme(v));
  themeToggle.classList.add('theme-checkbox'); // kept in step with the floating moon/sun button
  form.append(section('Appearance', [
    el('label.row', {}, [
      el('span', {}, 'Dawn Mode (dark)'),
      themeToggle,
    ]),
    el('p.dim', {}, 'A warm, low-light palette for pre-dawn scouting and dark rooms. Also toggled anywhere from the moon/sun button, top-right. Remembered on this device.'),
  ]));

  form.append(section('Live eBird overlay', [
    el('label.row', {}, [el('span', {}, 'Enabled'), checkbox(e.enabled, (v) => saveEbirdSettings({ enabled: v }))]),
    el('label.row', {}, [el('span', {}, 'Proxy base URL'),
      el('input', { value: e.proxyBase, placeholder: '/api/ebird', onchange: (ev) => saveEbirdSettings({ proxyBase: ev.target.value }) })]),
    el('p.dim', {}, 'Powers the “seen recently” badges and the live line on species pages. Calls a same-origin proxy that injects the eBird key server-side; everything else works offline without it.'),
    el('button.btn', { onclick: async (ev) => { ev.target.textContent = 'Probing…'; const ok = await probe(); ev.target.textContent = ok ? '✓ Overlay reachable' : '✗ Not reachable (app still works offline)'; } }, 'Test overlay'),
  ]));

  root.append(form);
}

// Turning auto-switch ON asks the browser for location NOW, on this tap (the
// documented "once" prompt), and says what happened — instead of silently
// deferring the prompt to the next app open and then failing mute if it's
// denied. A blocked permission flips the toggle back off so it never claims to
// work when it can't (labels stay honest; every failure explains itself).
function requestAutoSwitchPermission(cb) {
  if (!navigator.geolocation) {
    setAutoSwitch(false); if (cb) cb.checked = false;
    toast('This device can’t provide location, so auto-switch can’t run.');
    return;
  }
  toast('Checking your location…');
  navigator.geolocation.getCurrentPosition(
    () => toast('Location on — Frame will hop to the region you’re standing in when you open it.'),
    (err) => {
      if (err && err.code === err.PERMISSION_DENIED) {
        setAutoSwitch(false); if (cb) cb.checked = false;
        toast('Location is blocked, so auto-switch can’t run. Allow location for this site in your browser, then turn it on again.');
      } else {
        toast('Couldn’t read your location just now — Frame will try again next time it opens.');
      }
    },
    { maximumAge: 600000, timeout: 8000 },
  );
}

function section(title, kids) { return el('section.card.setting', {}, [el('h2', {}, title), ...kids]); }
function checkbox(checked, onchange) { const c = el('input', { type: 'checkbox' }); c.checked = checked; c.addEventListener('change', () => onchange(c.checked)); return c; }

// Share a region as an import link: the native share sheet where available
// (iOS/iPadOS), else copy to the clipboard with inline button feedback.
function shareRegion(r, btn) {
  const url = `${location.origin}${location.pathname}#/import?n=${encodeURIComponent(r.name)}&c=${r.counties.join(',')}`;
  if (navigator.share) {
    navigator.share({ title: `Frame region: ${r.name}`, url }).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(url).then(
    () => { const t = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = t; }, 1500); },
    () => { btn.textContent = 'Copy failed'; });
}
