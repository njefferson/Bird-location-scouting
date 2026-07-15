// =============================================================================
// ROADMAP — planned features, shown in the About (ⓘ) panel above "What's new".
// =============================================================================
// Edit this alongside changelog.js each release: ship a feature → delete its
// entry here and describe it in the new changelog entry. Keep items short,
// user-facing, and honest — only things actually planned, in planned order.
// =============================================================================

export const ROADMAP = [
  // Noah's asks, 2026-07-15 (given with the v24/v25 go). He also said "other
  // things" — open-ended; confirm with him before inventing more.
  // v27 shipped "A bottom tab bar that never disappears" — the floating dock
  // got a firmer edge (higher-contrast border), a layered warm shadow, and a
  // bright top lip so it always reads as a solid control in bright light, both
  // themes. Tokens: --dock-line / --dock-shadow / --dock-lip in styles.css.
  { title: 'Icons that do things, everywhere',
    detail: 'the facet icons go to work across the whole app: wherever an icon appears and a filter makes sense — species pages, the target picker, the seen list — tapping it filters, so what you touch responds.' },
  { title: 'Collapsible groups when picking target birds',
    detail: 'the species sections in the target-bird picker fold up, so starring birds stops being one long scroll.' },
  // v24 shipped "Photo-first ranking" — frequency × a transparent facet-derived
  // shootability weight (behaviour × size), default on, camera chip + tables,
  // one-tap plain-presence exit; target-presence mode stays frequency-only.
  // v23 shipped "Facet icons" — the 0–100 score was replaced by per-site bird-
  // group icons (bright/subdued/faint from real frequency) that double as a
  // tri-state filter, plus size / nest / behaviour filters.
  // v22 shipped "Bird lists" — starring is informational (where & when) with an
  // optional presence-ranking toggle, plus a seen/life list and "New for me".
  // v21 shipped "Pick your own target birds" — a personal, on-device target
  // list (now reworked by v22 to be informational-by-default).
  // v20 shipped the map landmarks (rivers, roads, lakes, parks, coastline),
  // county-name labels, the colour key and tap-to-explain scores. Still on the
  // list from that request: the fussier, messier land-use layers.
  { title: 'More map landmarks',
    detail: 'closed / restricted areas and school campuses on the county map, where the data is clean enough to help rather than clutter — offline like the rest of the basemap.' },
  // Noah, 2026-07-15 (with the v26 go): the access-notes field is a promise the
  // app can't keep — there will never be a hand-curated pass, so most hotspots
  // show "no curated access notes yet" forever. Decide, don't leave it dangling.
  { title: 'Access notes: fill them in, or drop the field',
    detail: 'most hotspots read “no curated access notes yet”, and there will never be a manual curation pass — so either populate access guidance from a real data source (eBird’s hotspot info or OpenStreetMap) or remove the field and its placeholder entirely, so the app never promises a note that isn’t coming.' },
];
