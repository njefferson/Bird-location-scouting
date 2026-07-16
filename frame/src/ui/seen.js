// =============================================================================
// SEEN / LIFE LIST — the picker screen (#/seen), the standing "New for me" mode
// indicator, and a reusable ✓ toggle. Marking a bird seen records it on your
// life list so you can focus on the ones you still need. Seen birds are never
// removed from a hotspot's score — they're dimmed everywhere and excluded from
// ONE optional mode ("New for me"), which announces itself with a standing bar
// and a non-destructive exit, per the product's taste rules.
// =============================================================================
import { el, clear, toast } from './dom.js';
import { SPECIES } from '../data/species.js';
import { HABITATS } from '../data/habitats.js';
import { STATUS_LABEL } from '../model/inference.js';
import { facetsActive, applyFacetFilter } from '../model/facets.js';
import { facetBar, facetIconButton } from './facetbar.js';
import {
  isSeen, toggleSeen, addSeen, seenCount, getSeen, clearSeen, setSeen,
  newBirdsOn, setNewBirds, newBirdsActive,
} from '../model/seen.js';

// Size + behaviour facet icons — each a tri-state filter (tap to narrow the
// browse list, and every ranked view, to birds like this one).
function sizeBehaviorIcons(s, onChange) {
  return el('span.sp-facets', {}, [
    facetIconButton('size', s.size, { size: 18, onChange }),
    facetIconButton('behavior', s.behavior, { size: 18, onChange }),
  ]);
}

function primaryHabitat(s) {
  const entries = Object.entries(s.habitats || {});
  if (!entries.length) return { key: 'other', label: 'Other' };
  const [key] = entries.sort((a, b) => b[1] - a[1])[0];
  return { key, label: HABITATS[key]?.label || key };
}

/**
 * A "seen" toggle for one species. `onToggle(nowSeen)` lets the caller update
 * its own surrounding UI (dimming, counts) without a full re-render.
 */
export function seenButton(s, onToggle) {
  const btn = el('button.seen-btn', {
    'aria-label': isSeen(s.name) ? `Remove ${s.name} from your seen list` : `Mark ${s.name} as seen`,
    title: isSeen(s.name) ? 'On your life list — tap to remove' : 'Mark as seen',
  });
  const paint = () => {
    const on = isSeen(s.name);
    btn.classList.toggle('on', on);
    btn.textContent = on ? '✓' : '＋';
    btn.title = on ? 'On your life list — tap to remove' : 'Mark as seen';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  btn.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const now = toggleSeen(s.name);
    paint();
    onToggle?.(now);
  });
  paint();
  return btn;
}

/**
 * The standing "New for me" indicator, prepended to Ranking / Planner / Map.
 * Returns null unless the mode is actually on — a mode announces itself only
 * while it's steering the ranking. When on: "New for me — hiding birds you've
 * already got" · [Show all birds] · [Edit].
 */
export function newBirdsBar(state, nav, rerender) {
  if (!newBirdsActive()) return null;
  const n = seenCount();
  const bar = el('div.newbar.engaged');
  bar.append(el('span.tb-mark', { 'aria-hidden': 'true' }, '✦'));
  bar.append(el('span.tb-label', {}, [
    el('strong', {}, 'New for me'),
    ` — ranking counts only the birds you haven’t got (${n} on your life list, set aside).`,
  ]));
  bar.append(el('div.tb-actions', {}, [
    el('button.btn.small', { onclick: () => { setNewBirds(false); rerender(); } }, 'Show all birds'),
    el('button.btn.ghost.small', { onclick: () => nav.go('#/seen') }, 'Edit'),
  ]));
  return bar;
}

// =============================================================================
// PICKER (#/seen) — bulk-import a life list, then browse & check off birds.
// =============================================================================
export function renderSeen(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'),
    el('div.title-row', {}, [
      el('h1', {}, 'Birds I’ve seen'),
      el('span.subtitle', {}, 'Your life list — mark what you’ve got, then focus on what’s new.'),
    ]),
  ]));

  const summary = el('div.tg-summary');
  const listWrap = el('div.tg-list');

  // Standing facet-filter bar for this screen (see the target picker): a tapped
  // size/behaviour icon sets the shared filter, announced here with a one-tap
  // exit and reflected by narrowing the browse list below. Local repaint only,
  // so the import textarea is never wiped.
  const facetSlot = el('div.facet-slot');
  const onFacetChange = () => { repaintFacetBar(); repaintList(); };
  function repaintFacetBar() {
    const bar = facetBar(state, nav, onFacetChange);
    facetSlot.replaceChildren(...(bar ? [bar] : []));
  }

  function repaintSummary() {
    clear(summary);
    const n = seenCount();
    summary.append(el('span.tg-count', {}, n
      ? `${n} bird${n === 1 ? '' : 's'} on your list`
      : 'Nothing marked yet — check off birds, or import below.'));
    if (n) {
      const toggle = el('label.tg-toggle', {}, [
        el('span', {}, '“New for me” mode'),
        (() => { const c = el('input', { type: 'checkbox' }); c.checked = newBirdsOn(); c.addEventListener('change', () => setNewBirds(c.checked)); return c; })(),
      ]);
      summary.append(toggle);
      summary.append(el('button.btn.ghost.small', {
        // Destructive, so it's undoable — no wiping a life list without a way back.
        onclick: () => {
          const wiped = getSeen();
          if (!wiped.length) return;
          clearSeen(); repaintList(); repaintSummary();
          toast(`Cleared ${wiped.length} bird${wiped.length === 1 ? '' : 's'} from your life list.`, {
            action: { label: 'Undo', onClick: () => { setSeen(wiped); repaintList(); repaintSummary(); } },
          });
        },
      }, 'Clear all'));
    }
  }

  // Bulk import: paste names (one per line) or a pasted eBird life-list export.
  // We match each line against the curated species, so a whole CSV row works too.
  const importBox = el('details.tg-import', {}, [
    el('summary', {}, 'Import a list'),
    (() => {
      const ta = el('textarea.import-ta', { rows: 6, placeholder: 'Paste bird names, one per line — or paste rows from an eBird life-list export. We’ll match the ones in the curated list.' });
      const status = el('p.dim.import-status', {});
      const btn = el('button.btn.primary', {
        onclick: () => {
          const lines = ta.value.split('\n');
          const { added, matched, unmatched } = addSeen(lines);
          repaintList(); repaintSummary();
          const bits = [`Matched ${matched} bird${matched === 1 ? '' : 's'} (${added} newly added)`];
          if (unmatched.length) bits.push(`${unmatched.length} line${unmatched.length === 1 ? '' : 's'} didn’t match the curated list`);
          status.textContent = bits.join(' · ') + '.';
          toast(added ? `Added ${added} bird${added === 1 ? '' : 's'} to your life list.` : 'No new birds matched.');
        },
      }, 'Import');
      return el('div.import-wrap', {}, [ta, el('div.import-actions', {}, [btn, status])]);
    })(),
  ]);

  const search = el('input.search', { type: 'search', placeholder: 'Filter species…', value: state.seenQuery || '' });
  search.addEventListener('input', () => { state.seenQuery = search.value; repaintList(); });

  function repaintList() {
    clear(listWrap);
    const q = (state.seenQuery || '').trim().toLowerCase();
    // Compose the text search with the tapped icon-filters.
    const pool = facetsActive() ? applyFacetFilter(SPECIES) : SPECIES;
    const match = pool.filter((s) => !q || s.name.toLowerCase().includes(q));
    if (!match.length) {
      listWrap.append(el('p.dim', {}, facetsActive()
        ? 'No species match your icon filters (and search). Tap “Show all birds” above to widen.'
        : 'No species match that filter.'));
      return;
    }
    const groups = new Map();
    for (const s of match) {
      const g = q ? { key: 'matches', label: 'Matches' } : primaryHabitat(s);
      if (!groups.has(g.key)) groups.set(g.key, { label: g.label, items: [] });
      groups.get(g.key).items.push(s);
    }
    for (const { label, items } of groups.values()) {
      items.sort((a, b) => a.name.localeCompare(b.name));
      listWrap.append(el('h2.tg-group', {}, label));
      for (const s of items) listWrap.append(row(s));
    }
  }

  function row(s) {
    const node = el('div.tg-row.seen-row', { class: isSeen(s.name) ? 'on' : '' }, [
      seenButton(s, () => { node.classList.toggle('on', isSeen(s.name)); repaintSummary(); }),
      el('div.tg-row-main', {}, [
        el('span.tg-name', {}, s.name),
        el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
      ]),
      sizeBehaviorIcons(s, onFacetChange),
    ]);
    return node;
  }

  repaintSummary();
  repaintFacetBar();
  repaintList();
  root.append(summary);
  root.append(importBox);
  root.append(el('p.dim.tg-hint', {}, 'Seen birds stay visible everywhere — just dimmed — and still count toward every hotspot’s photographer score. They’re set aside only in “New for me” mode, which re-ranks the hotspots by the birds you still need. Your list lives on this device.'));
  root.append(facetSlot);
  root.append(el('div.search-wrap', {}, search));
  root.append(listWrap);
}
