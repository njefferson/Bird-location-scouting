# Frame — handoff (COMPLETE)

> **Status: done.** The original handoff below has been carried out — the app
> lives in this repo (`njefferson/Bird-location-scouting`), and **real eBird
> frequency + checklist data is loaded** in per-county files under
> `frame/data/counties/` (committed). Hotspots read *Documented*, not *Inferred*.
> This file is kept only as an operations reference for the things that still
> need *you* (a human with credentials), plus the refresh procedure.

## What this is
`frame/` is a self-contained installable PWA: a bird-photography hotspot planner
for the Sacramento foothills (and, via regions, the wider state). Hotspots are
ranked by presence = Σ frequency(species) per month (v23 removed the old
subjective photoability weight); each spot shows objective bird-group facet
icons that double as tri-state filters. See `frame/README.md`.

## Things only you can provide (don't try to fake these)
- **GitHub auth** — to push / set secrets.
- **Cloudflare token + account ID** — for the deploy.
- **eBird session cookie** — only needed to *refresh* the histogram data.

### Deploy secrets (one-time, if not already set)
Set three repo secrets on `Bird-location-scouting` (Settings → Secrets and
variables → Actions), then the deploy publishes to
`https://bird-location-scouting.pages.dev/`:
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EBIRD_API_TOKEN` (the last is
optional — it turns on the live "seen recently" overlay).

## Refreshing the real frequency data (optional, ~quarterly)
The data is already loaded; eBird frequency is a multi-year average, so it
rarely needs updating. Two ways to refresh — **no computer needed for the
first**:

### From an iPad (or any device) — the automated way
The **Refresh eBird data** GitHub Action does the whole job on a runner:
validates species names, rebuilds **every county's** data file (all 58 CA + the
5 Tahoe/Reno NV counties — ~2 h at the old depths, ~4.5 h with the featured counties at full depth), refreshes `taxonomy.json`, commits, and
deploys. It also runs itself quarterly. It needs the `EBIRD_API_TOKEN` secret
and a fresh eBird session cookie in the `EBIRD_COOKIE` repo secret. If a run
dies partway (cookie expired mid-build), the finished counties are still
committed — update the cookie and re-run with **Resume partial run** checked to
pick up where it stopped.

**Getting the cookie — DESKTOP DevTools is the ONLY way.** (A bookmarklet used
to be described here. It CANNOT work and never could: eBird's session cookie is
HttpOnly, so `document.cookie` — and therefore any bookmarklet or Shortcut —
physically cannot see it. It happily copies the *non-session* cookies and
reports "✓ copied", which is how it burned real attempts. Proven 2026-07-05;
recorded in CLAUDE.md; do not resurrect the bookmarklet.)

**The refresh:**
1. On a computer, signed in at ebird.org: open DevTools (F12 / ⌘⌥I) →
   **Network** tab → click any ebird.org request → **Request Headers** → copy
   the entire value of the `cookie:` header.
2. github.com → this repo → **Settings → Secrets and variables → Actions →
   `EBIRD_COOKIE`** → update (create it the first time) → paste.
3. **Actions** tab → **Refresh eBird data** → **Run workflow** (or ask a
   Claude session to fire it by push-trigger — no button needed).

Done — if the data changed it commits and redeploys, and installed apps pick
it up automatically within a couple of loads (the service worker refreshes its
cache in the background). If the run fails with a cookie error, repeat steps
1–2 with a fresh cookie and re-run. The cookie-freshness probe
(`.github/trigger/probe-ebird`, ~15 s) tells you whether the stored cookie is
still alive before committing to a multi-hour build.

### From a computer — the manual way
```bash
export EBIRD_API_TOKEN="<key>"   # resolves species codes + hotspot lists
export EBIRD_COOKIE="<cookie: header from DevTools Network tab>"  # login-gated bar charts (HttpOnly — document.cookie can NEVER capture it)
node frame/scripts/build-counties.mjs validate            # sanity-check species names
node frame/scripts/build-counties.mjs build --force        # writes frame/data/counties/*.json + taxonomy.json
git add frame/data/counties frame/data/taxonomy.json && git commit -m "Refresh eBird county data" && git push
```

### What "regions" and county files are (v12+)
The planner covers a **region** = a named set of counties, defined in
`frame/src/data/counties.js` (`REGIONS`). Data lives in one file per county
(`frame/data/counties/US-CA-###.json`), and the app loads only the active
region's counties — but the pipeline pre-builds **all** counties, so adding a
county to a region is instant (no build needed). `species.js` holds only your
curated per-species facets (type / size / nest / behaviour) + model inputs,
keyed by eBird common name; the codes are resolved from
eBird into `frame/data/taxonomy.json` by the build (so no code is ever
hand-typed).

## Release notes are automatic
Merging a change that touches `CHANGELOG.md` on `main` auto-publishes the
matching GitHub Release (tag `frame-v<n>`) via the **Publish release from
CHANGELOG** workflow — no manual pasting. Just keep the newest section at the
top of `CHANGELOG.md` in the existing `## v<n> — YYYY-MM-DD` format (mirrored
from `frame/src/data/changelog.js`).

## Optional: cover a new area
Add the county's eBird code (e.g. `US-CA-045` for Mendocino) to a region in
`frame/src/data/counties.js` (`REGIONS`) — or add a whole new region. Its data
is already pre-built by the quarterly refresh, so the hotspots appear on the
next deploy with no build step. Depth (how many hotspots per county; default 15, the four
featured counties keep every hotspot) is set per county in the same file — bump it and re-run
the refresh if you want a new home turf covered more deeply.
