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
