# Frame — Bird Photography Hotspot Planner

A personal, installable PWA that answers, for a fixed geographic box: **where do I
go, in which month, to photograph which birds** — ranked by *photographic*
opportunity (not by lister rarity). Built for a Nikon Z50 II + 50–250mm DX
(~375mm equiv) shooter based in Shingle Springs, CA.

> Lives in `frame/` alongside the separate Infrared Photography Studio app at the
> repo root. The two share nothing but git history.

## The idea (one line)
`HotspotScore(h, m) = Σ_species frequency(s,h,m) × photoability(s)`, normalized
0–100 per month. A bird must be **present** (frequency) *and* **shootable**
(photoability) to count — we multiply, never add.

## Three data layers (spec §2)
| Layer | What | Source | State |
|---|---|---|---|
| **A. Reference** | per-species × month frequency + checklist effort (N) | eBird histogram CSV / EBD (static, quarterly) | **inferred** until you run the build script |
| **B. Photoability** | how shootable each species is, 0–1 | curated table in `src/data/species.js` | shipped |
| **C. Live overlay** | "seen in last N days", notable, nearest-recent | eBird API 2.0 at runtime, via proxy | optional, degrades gracefully |

### Honesty rules (spec §0/§3/§6) — enforced in code
- **No fabricated numbers.** Where there is no real eBird histogram, frequency
  comes from a *transparent* model (`src/model/inference.js`):
  `abundance × habitatAffinity × seasonality`. Every such value is flagged
  **inferred** in the UI (a `*`, a dashed sparkline, the exact rule on hover).
- The trust tag (Documented / Opportunity / Exploratory / Thin / **Inferred**)
  is driven by real checklist count N. Without N loaded, hotspots read
  **Inferred** — never dressed up as Documented.
- The eBird API **cannot** serve frequency; we never pretend it does. It only
  powers the live badges.

## Deploy (rolled into the IR project, for now)
`.github/workflows/deploy-frame.yml` builds the IR app and serves Frame
**alongside it** in the existing `infrared-photography-studio` Pages project:

- IR app → `https://infrared-photography-studio.pages.dev/`
- **Frame → `https://infrared-photography-studio.pages.dev/frame/`**
- eBird proxy → mounted at the project root (`/api/ebird`)

This shares the IR project because the current Cloudflare API token is scoped to
that one project. To split Frame into its own `frame-bird-planner` project later,
broaden the token to account-wide *Cloudflare Pages: Edit* and point the deploy
command back at `frame-bird-planner` (one line).

> **Heads-up:** the IR app's own `deploy.yml` (triggered from the
> `claude/lost-session-info-huy4ha` branch) doesn't include Frame, so a deploy
> from that branch will temporarily drop `/frame` until this workflow runs again.

To switch on the **live eBird overlay**, one thing from your phone:

> github.com → repo **Settings → Secrets and variables → Actions → New
> repository secret** → name `EBIRD_API_TOKEN`, value = your eBird key → save,
> then re-run the **“Deploy IR app + Frame”** action.

The workflow pushes that secret to Cloudflare as a runtime variable the proxy
reads. The key never lands in the repo or the browser bundle. Until it's set,
the app still works — the live badges just stay off.

## Run it locally (optional)
Pure static files, no build step (native ES modules):
```bash
cd frame && python3 -m http.server 8000   # or: npx serve .
```
Install to the home screen from the browser's Share/Install menu (PWA).

## Refresh the real data (spec §2A, §7 v0→v1)
Real eBird frequencies for all 30 hotspots are already loaded in
`data/reference.json`. To **refresh** them (or rebuild from scratch):

```bash
# 1. (optional) build the common-name → species-code map
EBIRD_API_TOKEN=yourkey node scripts/build-reference.mjs taxonomy

# 2. fetch real hotspot ids/coords for the box from the eBird API
EBIRD_API_TOKEN=yourkey node scripts/build-reference.mjs enumerate

# 3. From each hotspot's eBird bar-chart page, "Download Histogram Data".
#    Save each CSV named after the scaffold id, e.g. wb-pond.csv, into ./csv-dir
#    (histogram data is login-gated and NOT in the API — this step is manual).
node scripts/build-reference.mjs histogram ./csv-dir
```
This writes `data/reference.json`; the app loads it automatically and flips the
affected hotspots/months from *inferred* to *documented*. Refresh quarterly —
eBird frequency is a multi-year average, it does not move week to week.

> **Note:** this environment's egress policy blocks `api.ebird.org`, so the
> enumerate/taxonomy steps must be run on your own machine. The key is read only
> from `EBIRD_API_TOKEN` and is never committed.

## What works on iOS alone vs. what needs a desktop
- **Works now, iOS only:** the whole planner — ranking, filters, the year
  heatmap, species search — on the **real, already-loaded eBird frequencies**,
  plus (after the one-tap secret above) the **live** "seen in last N days" /
  notable / nearest-recent badges from the eBird API.
- **Needs a desktop only to refresh the data (optional):** eBird's per-hotspot
  frequency lives only in login-gated histogram CSVs (not the API), so it can't
  be re-pulled from a phone or a server. The committed `data/reference.json` is
  already real; to update it, re-run the build step below on any computer and
  commit the result. eBird frequency is a multi-year average, so this only needs
  doing quarterly at most — the app stays fully usable in between.

## Screens (spec §5)
- **Ranking** — current-month top-15 cards: score, trust tag, N, top-3
  photographable species with frequency %, live "seen" badge, Maps + matrix +
  access buttons. Month selector drives everything. Four opportunity filters
  (Shoot Now / Underrated / Be the Documenter / Skip-Thin).
- **Planner** — hotspot × month heatmap of HotspotScore; tap a cell → detail.
- **Species** — search a bird → best hotspot + month, per-hotspot sparklines,
  live "nearest recent".
- **Settings** — the editable box, live-overlay config, data provenance.

## Layout
```
frame/
  index.html  manifest.webmanifest  sw.js  icon.svg
  src/
    main.js                 app bootstrap + hash routing
    styles.css
    data/   species.js  hotspots.js  habitats.js     # curated reference
    model/  inference.js  scoring.js  ebird.js  reference.js
    ui/     dom.js  badges.js  views.js
  data/     reference.json  (built artifact; empty scaffold by default)
  scripts/  build-reference.mjs   ebird-proxy/
```

## Status vs. the spec milestones (§7)
- **v0 (MVP):** ✅ hotspots, photoability, scoring, current-month top list, month
  selector — end-to-end.
- **v1:** ✅ trust tags + N, four opportunity filters, Maps links, **real eBird
  frequency + checklist counts loaded for all 30 hotspots** (`data/reference.json`)
  — hotspots read *Documented*, not *Inferred*. Refresh quarterly with the build
  script. (Any species without a histogram entry still falls back to the inference
  model and is marked *inferred*.)
- **v2:** ✅ matrix heatmap, species search, live recent/notable overlay (proxy);
  ⏳ Macaulay thumbnails (no public count API — left for v3).
