# Frame — handoff (COMPLETE)

> **Status: done.** The original handoff below has been carried out — the app
> lives in this repo (`njefferson/Bird-location-scouting`), and **real eBird
> frequency + checklist data for all 30 hotspots is loaded** in
> `frame/data/reference.json` (committed). Hotspots read *Documented*, not
> *Inferred*. This file is kept only as an operations reference for the two
> things that still need *you* (a human with credentials), plus the refresh
> procedure.

## What this is
`frame/` is a self-contained installable PWA: a bird-photography hotspot planner
for a fixed box near Sacramento, CA. Score = Σ frequency(species) ×
photoability(species), per month. See `frame/README.md`.

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
downloads all 30 bar charts, rebuilds `reference.json`, commits, and deploys.
It also runs itself quarterly. The only thing it needs from you is a fresh
eBird session cookie in the `EBIRD_COOKIE` repo secret (sessions last a long
time, so this is rare).

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
EBIRD_COOKIE="<pasted document.cookie>" node frame/scripts/download-barcharts.mjs ./barcharts
node frame/scripts/build-reference.mjs localbarcharts ./barcharts
git add frame/data/reference.json && git commit -m "Refresh eBird frequency + N" && git push
```

## Release notes are automatic
Merging a change that touches `CHANGELOG.md` on `main` auto-publishes the
matching GitHub Release (tag `frame-v<n>`) via the **Publish release from
CHANGELOG** workflow — no manual pasting. Just keep the newest section at the
top of `CHANGELOG.md` in the existing `## v<n> — YYYY-MM-DD` format (mirrored
from `frame/src/data/changelog.js`).

## Optional: more hotspots
To use 50 hotspots instead of 30: re-run
`EBIRD_API_TOKEN=<key> node frame/scripts/build-reference.mjs listbox`,
extend `frame/src/data/hotspots.js` with the next entries (real locIds from that
list), then refresh the data as above.
