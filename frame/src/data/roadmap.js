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
  // v31 shipped "Collapsible groups when picking target birds" — the habitat
  // sections in the target-bird picker's browse list now fold (default collapsed,
  // per-section state persisted in localStorage frame.targetGroupsOpen), with a
  // "Browse by habitat" expand-all/collapse-all row and per-section count + camera
  // tally. Search / active facet filter still render matches open and flat.
  // v28 shipped "Icons that do things, everywhere" — the type/size/nest/behaviour
  // icons on the species matrix, a species' page, and the target & seen picker
  // rows are now tri-state filter buttons (reusing the guild row's want/exclude);
  // each picker/species screen carries its own standing facetBar exit, and the
  // pickers' browse lists narrow to matching birds. Shared control:
  // facetIconButton() in ui/facetbar.js.
  // v27 shipped "A bottom tab bar that never disappears" — the floating dock
  // got a firmer edge (higher-contrast border), a layered warm shadow, and a
  // bright top lip so it always reads as a solid control in bright light, both
  // themes. Tokens: --dock-line / --dock-shadow / --dock-lip in styles.css.
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
