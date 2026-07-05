# Changelog

Release notes for **Frame** (bird-location-scouting). Newest first. Versions
match the service-worker cache name (`frame-v<n>` in `frame/sw.js`) so you can
tell which build you're running. Source of truth: `frame/src/data/changelog.js`
(rendered in-app under About → "What's new" and published to GitHub Releases).

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
