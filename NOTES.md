# NOTES.md — Bird-location-scouting (Frame)

Source-of-truth index for this repo. (Standardized filename across Noah's apps;
this repo's detailed history predates it, so the truth is spread across a few
files — this note says where each part lives.)

## Where the truth lives
- **Product thesis, settled decisions, release history ("Project facts"), and
  the measured gotchas that must not be re-learned:** the long section in
  [`CLAUDE.md`](CLAUDE.md). That file is the working record; read it first.
- **Live roadmap (top items first):** `frame/src/data/roadmap.js`.
- **Release notes / changelog:** [`CHANGELOG.md`](CHANGELOG.md) (mirrored in-app
  under ⓘ → What's new, and to GitHub Releases).
- **Accessibility rules + append-only audit register:** [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
- **Shared cross-app rules** (values, taste, honesty, verification, release
  taxonomy, licensing, privacy, the AskUserQuestion ban, the metadata-confirm
  rule): the **Universal App Doctrine**, canonical at
  `DOCTRINE.md` in the noahjefferson hub repo.

## The app
`frame/` — a photographer's bird-hotspot scouting PWA (no build step; deploys to
bird-location-scouting.pages.dev). Region-aware, offline-first, on-device, no
account. See `CLAUDE.md` for the architecture facts and per-release detail.

## License
PolyForm Noncommercial 1.0.0 (`LICENSE.md`) — nobody sells Noah's work. Map-data
credits (Natural Earth PD, OSM ODbL, game-icons CC BY) live in the app's About
screen; eBird data is used under its API terms (no bulk redistribution).
