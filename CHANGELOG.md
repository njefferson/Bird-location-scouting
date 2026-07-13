# Changelog

Release notes for **Frame** (bird-location-scouting). Newest first. Versions
match the service-worker cache name (`frame-v<n>` in `frame/sw.js`) so you can
tell which build you're running. Source of truth: `frame/src/data/changelog.js`
(rendered in-app under About → "What's new" and published to GitHub Releases).

## v19 — 2026-07-13
- A fresh "Field Notebook" look: warm, paper-toned colours with the IBM Plex type family — a serif for names and titles, and a monospace for every number so scores and frequencies line up cleanly.
- New Dawn Mode: a warm dark theme for pre-dawn scouting and dark rooms. Turn it on under Settings → Appearance; your choice is remembered on this device and applied instantly, with no flash on open.
- Crisper tab icons — hand-drawn line symbols for Ranking, Planner, Map, Species and Settings in place of the old glyphs.
- Same rankings, same data, same everything else — this is a visual refresh only.

## v18 — 2026-07-06
- Auto-switch now offers an Undo: when the app hops to the region you're standing in, the notice has an Undo button that puts you right back where you were.
- Undo for the county picker's Clear — wipe your selection by accident and a tap brings every county back.
- Deleting a saved region can be undone too: a "Deleted …" notice restores the region (and re-selects it if it was active) if you tap Undo.
- The hotspot Map tab now shows the surrounding counties as a quiet backdrop instead of near-black — the region you're in still stands out, but you can see where it sits.
- The county picker shows a standing "Tap counties to build your region" indicator so it's always clear you're building a set and how to finish.
- Empty regions and broken share links now explain themselves and offer a way forward instead of showing a blank screen.

## v17 — 2026-07-05
- New Map tab: every hotspot in the active region pinned on the county map, opening zoomed to your region. Pin brightness follows this month's photographer score — tap a pin to open that hotspot.
- Location auto-switch (off by default, in Settings): when enabled, the app notices which of your regions you're standing in on open and switches to it.
- Share any region as a link (Settings → Share): opening it on another device drops its counties into the picker, ready to save. Handy for moving regions between iPad and phone.
- The live-sightings search radius now scales with the size of the active region (25–50 km) instead of a fixed 30 km circle.
- The county picker now says how deep each county's hotspot data goes.

## v16 — 2026-07-05
- Settings cleaned up: the leftover "box" coordinates section is gone (regions cover that now), and the data-provenance details moved into the Regions section.
- The species pages' live "last reported at…" line now searches around your active region, not always the Sacramento area.
- Removed the never-used "edge" chip and freshened region-era wording throughout (search subtitle, badge tooltips, the ⓘ panel).

## v15 — 2026-07-05
- Icon fix: the bird's tail had detached when its posture straightened in v14 — it's reattached and follows the body now.

## v14 — 2026-07-05
- Region switcher: pills at the top (Home, Humboldt, and up to 3 of your own regions) — one tap moves the whole planner to that region.
- County picker map: a pinch-zoomable map of California plus the Tahoe/Reno counties. Tap counties to select them (mirrored by an alphabetical checklist), name the set, and save it as a region. Every county already has bar-chart data, so any selection works instantly.
- Manage your saved regions from Settings → Regions (edit or delete). Your regions live on this device.
- The live "seen recently" overlay now follows the active region instead of always centering on the Sacramento box.

## v13 — 2026-07-05
- After an update, the app now shows a one-time "What's new" pop-up — once per release, then never again.
- New app icon: a golden-hour wetland scene — bird perched on a branch, reeds, a dock and the setting sun, all inside the viewfinder.

## v12 — 2026-07-04
- Groundwork for multiple regions: the planner now loads its hotspots from per-county data files, so it can cover the coast (Humboldt) and the mountains, not just the Sacramento box. No visible change yet — the region switcher and county picker come next.
- The ⓘ panel now shows a "Coming next" roadmap of planned features, above "What's new".
- The quarterly data refresh now pre-builds every California county (plus the Tahoe/Reno ring), so any county added to a region later already has real bar-chart data waiting.
- Expanded the species list from 55 to 173, adding coastal (shorebirds, gulls, seabirds), Central Valley waterfowl/marsh, and Sierra/Tahoe montane birds — all rated for the same 375mm reach.
- Species codes now come straight from the eBird taxonomy at build time instead of being hand-typed, so the wrong-code bug that hid data can't happen again.
- A bird that eBird has never reported at a hotspot now reads as a true zero, not an "inferred" estimate — more honest, and it clears the stray "inferred" chips on well-covered hotspots.

## v11 — 2026-07-03
- Fixed wrong eBird species codes for 8 birds — their ↗ eBird links now open the right page and their live "seen recently" badges can light up. (Golden-crowned Sparrow was even showing Golden-crowned Kinglet sightings.)
- Installed apps now pick up new data and fixes automatically on the next couple of loads — no more waiting on a version bump.
- Proper iOS home-screen icon (PNG — iOS ignores SVG touch icons).
- The "seen Nd ago" badge now explains it means anywhere in the box, not necessarily at that hotspot.
- Renamed Black-crowned Night-Heron to "Black-crowned Night Heron" to match eBird — its real frequency data will load on the next data refresh.

## v10 — 2026-06-28
- The in-app "What's new" now shows the latest 5 releases with a link to the full changelog.

## v9 — 2026-06-28
- Added a "What's new" panel — release notes now live in the app, in this file, and on GitHub Releases.

## v8 — 2026-06-28
- The "inferred" tag now shows how many species are estimated (e.g. "1 inferred") and disappears when a hotspot's photographable birds are all real eBird data.
- Renamed the coverage badge from "N: 73" to "73 checklists", with a plain-language explanation on hover.

## v7 — 2026-06-28
- The Ranking now lists every hotspot, not a capped top-N (removed the list-length setting).

## v6 — 2026-06-28
- Tap a bird's name to open its Species page (with an external ↗ eBird link kept there).
- Sparklines gained a J–D month axis and faint month gridlines.

## v5 — 2026-06-28
- Added the ⓘ About panel explaining the photographer-first scoring.

## v1 — 2026-06-28
- Initial release: real eBird frequency + checklist data for 30 Sacramento-area hotspots, a live "seen recently" overlay, year planner, species search — installable and offline-capable.
