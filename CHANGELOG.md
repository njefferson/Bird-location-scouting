# Changelog

Release notes for **Frame** (bird-location-scouting). Newest first. Versions
match the service-worker cache name (`frame-v<n>` in `frame/sw.js`) so you can
tell which build you're running. Source of truth: `frame/src/data/changelog.js`
(rendered in-app under About → "What's new" and published to GitHub Releases).

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
