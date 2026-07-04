# Frame — handoff (COMPLETE)

> **Status: done.** The original handoff below has been carried out — the app
> lives in this repo (`njefferson/Bird-location-scouting`), and **real eBird
> frequency + checklist data is loaded** in per-county files under
> `frame/data/counties/` (committed). Hotspots read *Documented*, not *Inferred*.
> This file is kept only as an operations reference for the things that still
> need *you* (a human with credentials), plus the refresh procedure.

## What this is
`frame/` is a self-contained installable PWA: a bird-photography hotspot planner
for the Sacramento foothills (and, via regions, the wider state). Score =
Σ frequency(species) × photoability(species), per month. See `frame/README.md`.

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
validates species names, rebuilds every region county's data file, refreshes
`taxonomy.json`, commits, and deploys. It also runs itself quarterly. It needs
the `EBIRD_API_TOKEN` secret and a fresh eBird session cookie in the
`EBIRD_COOKIE` repo secret (sessions last a long time, so the cookie is rare).

**One-time setup — a cookie bookmarklet for iOS Safari** (no dev tools on
iPad): bookmark any page, then edit the bookmark and replace its URL with:
```
javascript:prompt('eBird cookie — copy this:',document.cookie)
```
Name it "eBird cookie".

**The refresh, entirely in Safari:**
1. Go to ebird.org and make sure you're signed in. Tap the bookmarklet,
   copy the text it shows.
2. github.com → this repo → **Settings → Secrets and variables → Actions →
   `EBIRD_COOKIE`** → update (create it the first time).
3. **Actions** tab → **Refresh eBird data** → **Run workflow**.

Done — if the data changed it commits and redeploys, and installed apps pick
it up automatically within a couple of loads (the service worker refreshes its
cache in the background). If the run fails with a cookie error, repeat steps
1–2 with a fresh cookie and re-run.

### From a computer — the manual way
```bash
export EBIRD_API_TOKEN="<key>"   # resolves species codes + hotspot lists
export EBIRD_COOKIE="<pasted document.cookie>"  # login-gated bar charts
node frame/scripts/build-counties.mjs validate            # sanity-check species names
node frame/scripts/build-counties.mjs build --force        # writes frame/data/counties/*.json + taxonomy.json
git add frame/data/counties frame/data/taxonomy.json && git commit -m "Refresh eBird county data" && git push
```

### What "regions" and county files are (v12+)
The planner covers a **region** = a named set of counties, defined in
`frame/src/data/counties.js` (`REGIONS`). Data lives in one file per county
(`frame/data/counties/US-CA-###.json`), and the app loads only the active
region's counties. To cover a new area, add its county code to a region (or add
a new region) in `counties.js`, then run the refresh — the pipeline builds any
county that belongs to a region. `species.js` holds only your photoability
judgments, keyed by eBird common name; the codes are resolved from eBird into
`frame/data/taxonomy.json` by the build (so no code is ever hand-typed).

## Release notes are automatic
Merging a change that touches `CHANGELOG.md` on `main` auto-publishes the
matching GitHub Release (tag `frame-v<n>`) via the **Publish release from
CHANGELOG** workflow — no manual pasting. Just keep the newest section at the
top of `CHANGELOG.md` in the existing `## v<n> — YYYY-MM-DD` format (mirrored
from `frame/src/data/changelog.js`).

## Optional: cover a new area
Add the county's eBird code (e.g. `US-CA-045` for Mendocino) to a region in
`frame/src/data/counties.js` (`REGIONS`) — or add a whole new region — then run
the **Refresh eBird data** Action. The pipeline builds any county that belongs
to a region, so the new area's hotspots appear automatically. Depth (how many
hotspots per county) is set per county in the same file.
