// =============================================================================
// CHANGELOG — single source of truth for release notes.
// =============================================================================
// Rendered in-app under About → "What's new", mirrored into /CHANGELOG.md, and
// published to GitHub Releases. Newest release first. The `version` matches the
// service-worker cache name (sw.js `CACHE = 'frame-v<n>'`) so a user can tell
// which build they're running. Keep entries short and user-facing.
// =============================================================================

export const CHANGELOG = [
  {
    version: 'v15',
    date: '2026-07-05',
    changes: [
      'Icon fix: the bird’s tail had detached when its posture straightened in v14 — it’s reattached and follows the body now.',
    ],
  },
  {
    version: 'v14',
    date: '2026-07-05',
    changes: [
      'Region switcher: pills at the top (Home, Humboldt, and up to 3 of your own regions) — one tap moves the whole planner to that region.',
      'County picker map: a pinch-zoomable map of California plus the Tahoe/Reno counties. Tap counties to select them (mirrored by an alphabetical checklist), name the set, and save it as a region. Every county already has bar-chart data, so any selection works instantly.',
      'Manage your saved regions from Settings → Regions (edit or delete). Your regions live on this device.',
      'The live “seen recently” overlay now follows the active region instead of always centering on the Sacramento box.',
    ],
  },
  {
    version: 'v13',
    date: '2026-07-05',
    changes: [
      'After an update, the app now shows this one-time “What’s new” pop-up — once per release, then never again.',
      'New app icon: a golden-hour wetland scene — bird perched on a branch, reeds, a dock and the setting sun, all inside the viewfinder.',
    ],
  },
  {
    version: 'v12',
    date: '2026-07-04',
    changes: [
      'Groundwork for multiple regions: the planner now loads its hotspots from per-county data files, so it can cover the coast (Humboldt) and the mountains, not just the Sacramento box. No visible change yet — the region switcher and county picker come next.',
      'The ⓘ panel now shows a “Coming next” roadmap of planned features, above “What’s new”.',
      'The quarterly data refresh now pre-builds every California county (plus the Tahoe/Reno ring), so any county added to a region later already has real bar-chart data waiting.',
      'Expanded the species list from 55 to 173, adding coastal (shorebirds, gulls, seabirds), Central Valley waterfowl/marsh, and Sierra/Tahoe montane birds — all rated for the same 375mm reach.',
      'Species codes now come straight from the eBird taxonomy at build time instead of being hand-typed, so the wrong-code bug that hid data can’t happen again.',
      'A bird that eBird has never reported at a hotspot now reads as a true zero, not an “inferred” estimate — more honest, and it clears the stray “inferred” chips on well-covered hotspots.',
    ],
  },
  {
    version: 'v11',
    date: '2026-07-03',
    changes: [
      'Fixed wrong eBird species codes for 8 birds — their ↗ eBird links now open the right page and their live “seen recently” badges can light up. (Golden-crowned Sparrow was even showing Golden-crowned Kinglet sightings.)',
      'Installed apps now pick up new data and fixes automatically on the next couple of loads — no more waiting on a version bump.',
      'Proper iOS home-screen icon (PNG — iOS ignores SVG touch icons).',
      'The “seen Nd ago” badge now explains it means anywhere in the box, not necessarily at that hotspot.',
      'Renamed Black-crowned Night-Heron to “Black-crowned Night Heron” to match eBird — its real frequency data will load on the next data refresh.',
    ],
  },
  {
    version: 'v10',
    date: '2026-06-28',
    changes: [
      'The in-app “What’s new” now shows the latest 5 releases with a link to the full changelog.',
    ],
  },
  {
    version: 'v9',
    date: '2026-06-28',
    changes: [
      'Added this “What’s new” panel — release notes now live in the app, in CHANGELOG.md, and on GitHub Releases.',
    ],
  },
  {
    version: 'v8',
    date: '2026-06-28',
    changes: [
      'The “inferred” tag now shows how many species are estimated (e.g. “1 inferred”) and disappears when a hotspot’s photographable birds are all real eBird data.',
      'Renamed the coverage badge from “N: 73” to “73 checklists”, with a plain-language explanation on hover.',
    ],
  },
  {
    version: 'v7',
    date: '2026-06-28',
    changes: [
      'The Ranking now lists every hotspot, not a capped top-N (removed the list-length setting).',
    ],
  },
  {
    version: 'v6',
    date: '2026-06-28',
    changes: [
      'Tap a bird’s name to open its Species page (with an external ↗ eBird link kept there).',
      'Sparklines gained a J–D month axis and faint month gridlines.',
    ],
  },
  {
    version: 'v5',
    date: '2026-06-28',
    changes: [
      'Added the ⓘ About panel explaining the photographer-first scoring.',
    ],
  },
  {
    version: 'v1',
    date: '2026-06-28',
    changes: [
      'Initial release: real eBird frequency + checklist data for 30 Sacramento-area hotspots, a live “seen recently” overlay, year planner, species search — installable and offline-capable.',
    ],
  },
];
