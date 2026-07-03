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
rarely needs updating. When you do want to refresh it, paste your eBird cookie
(on any ebird.org page: F12 → Console → `document.cookie` → copy), then:
```bash
EBIRD_COOKIE="<pasted>" node frame/scripts/download-barcharts.mjs ./barcharts
node frame/scripts/build-reference.mjs localbarcharts ./barcharts
git add frame/data/reference.json && git commit -m "Refresh eBird frequency + N" && git push
```
That rewrites `data/reference.json` and redeploys. Installed apps pick the new
data up automatically within a couple of loads (the service worker serves the
cached copy instantly and refreshes it in the background).

## Optional: more hotspots
To use 50 hotspots instead of 30: re-run
`EBIRD_API_TOKEN=<key> node frame/scripts/build-reference.mjs listbox`,
extend `frame/src/data/hotspots.js` with the next entries (real locIds from that
list), then refresh the data as above.
