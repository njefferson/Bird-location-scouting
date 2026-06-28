# Frame — handoff for a Claude Code session on a real computer

You are continuing a project that was built in a network-restricted remote
sandbox (which could not reach ebird.org or Cloudflare). You're now on a normal
computer with open internet — finish the move and load the real data.

## What this is
`frame/` is a self-contained installable PWA: a bird-photography hotspot planner
for a fixed box near Sacramento, CA. Score = Σ frequency(species) ×
photoability(species), per month. See `frame/README.md`.

## Current state
- The app is complete and currently deployed (rolled into another project) from
  the source repo `njefferson/IRstudio`, branch
  `claude/bird-photography-hotspot-planner-6uxbc7`.
- `frame/src/data/hotspots.js` already has the **top 30 hotspots with real eBird
  location IDs**.
- Frequencies are still the **inference model** (labeled "inferred"). The goal
  below is to replace them with **real eBird bar-chart data**.
- The user wants the project to live in a NEW repo: `njefferson/Bird-location-scouting`.

## Do this
**1. Move into the new repo** (the app is on a feature branch of the old one):
```bash
git clone https://github.com/njefferson/IRstudio.git
cd IRstudio && git checkout claude/bird-photography-hotspot-planner-6uxbc7 && cd ..
git clone https://github.com/njefferson/Bird-location-scouting.git
cd Bird-location-scouting
cp -r ../IRstudio/frame ./frame
mkdir -p .github/workflows && cp ./frame/scripts/deploy-standalone.yml .github/workflows/deploy.yml
git add -A && git commit -m "Frame bird planner: app + standalone deploy" && git branch -M main && git push -u origin main
```

**2. Deploy secrets** — ask the user for the Cloudflare token + account ID, and
set three repo secrets on `Bird-location-scouting` (via `gh secret set` if `gh`
is authenticated, else have the user add them on github.com):
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EBIRD_API_TOKEN`.
Then the deploy publishes to `https://bird-location-scouting.pages.dev/`.

**3. Load REAL frequency data** — ask the user to paste their eBird cookie
(on any ebird.org page: F12 → Console → `document.cookie` → copy), then:
```bash
EBIRD_COOKIE="<pasted>" node frame/scripts/download-barcharts.mjs ./barcharts
node frame/scripts/build-reference.mjs localbarcharts ./barcharts
git add frame/data/reference.json && git commit -m "Real eBird frequency + N" && git push
```
That redeploys; the app flips from "inferred" to "Documented" with real
per-month frequency and checklist counts.

## Things only the user can provide (don't try to fake these)
- GitHub auth (to push / set secrets), Cloudflare token + account ID, and the
  eBird session cookie. You cannot authenticate as the user to these services.

## Optional
- To use 50 hotspots instead of 30: re-run
  `EBIRD_API_TOKEN=<key> node frame/scripts/build-reference.mjs listbox`,
  extend `frame/src/data/hotspots.js` with the next entries (real locIds from
  that list), then re-run step 3.
