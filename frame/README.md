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

## Data model: regions & county files (v12+)
The planner covers a **region** — a named set of counties (`src/data/counties.js`
`REGIONS`; ships with Home = Sacramento/El Dorado/Placer and Humboldt). Real
eBird data lives in one file per county (`data/counties/US-CA-###.json`, keyed by
locId), and the app loads only the active region's counties, so coverage scales
without bloating any single download. `src/data/species.js` holds only the
curated *photoability* judgments, keyed by eBird common name — species **codes**
are resolved from the live eBird taxonomy at build time into `data/taxonomy.json`,
so a code is never hand-typed (that was the source of an earlier data-hiding bug).

## Refresh / extend the real data
**Easiest: the "Refresh eBird data" GitHub Action** — it validates species names,
rebuilds every region county's file, refreshes `taxonomy.json`, commits and
deploys on a runner. Needs the `EBIRD_API_TOKEN` and `EBIRD_COOKIE` repo secrets,
runs itself quarterly, and is fully driveable from a phone/iPad (see `HANDOFF.md`).
To cover a **new area**, add its county code to a region in `counties.js` and
re-run — the pipeline builds any county belonging to a region. By hand:

```bash
export EBIRD_API_TOKEN=yourkey     # species codes + hotspot lists
export EBIRD_COOKIE="<document.cookie from a signed-in ebird.org>"  # bar charts
node scripts/build-counties.mjs validate         # check species names resolve
node scripts/build-counties.mjs build --force    # writes data/counties/*.json + taxonomy.json
```
Refresh quarterly — eBird frequency is a multi-year average, it does not move
week to week.

> **Note:** this environment's egress policy blocks `api.ebird.org`, so a local
> build must run on your own machine (or just use the GitHub Action). Keys are
> read only from the environment and never committed.

## What works on iOS alone vs. what needs a desktop
- **Works now, iOS only:** the whole planner — ranking, filters, the year
  heatmap, species search — on the **real, committed eBird frequencies**, plus
  (after the one-tap secret) the **live** "seen recently" badges from the eBird API.
- **Refreshing/extending the data needs no computer:** the GitHub Action does the
  login-gated bar-chart pull on a runner; from an iPad you just paste a fresh
  cookie into the repo secret and tap "Run workflow" (see `HANDOFF.md`).

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
    data/   species.js  hotspots.js  habitats.js  counties.js   # curated reference
    model/  inference.js  scoring.js  ebird.js  regions.js
    ui/     dom.js  badges.js  views.js
  data/     counties/US-CA-###.json  (per-county eBird data)  taxonomy.json  (name→code)
  scripts/  build-counties.mjs  barchart-lib.mjs  ebird-proxy/
```

## Status vs. the spec milestones (§7)
- **v0 (MVP):** ✅ hotspots, photoability, scoring, current-month top list, month
  selector — end-to-end.
- **v1:** ✅ trust tags + N, four opportunity filters, Maps links, **real eBird
  frequency + checklist counts** for every hotspot (per-county files) — hotspots
  read *Documented*, not *Inferred*. Refresh quarterly with the build pipeline.
- **v12:** ✅ region/county data model, 173-species list, taxonomy-derived codes,
  honest real-zero for unreported species. ⏳ region switcher + county-picker map
  (v13), location auto-switch (v14), hotspot map view (v15).
- **v2:** ✅ matrix heatmap, species search, live recent-sightings overlay (proxy);
  ⏳ Macaulay thumbnails (no public count API — left for v3); ⏳ per-hotspot and
  notable-sightings overlays (API client groundwork existed; re-add when a view
  needs them — see git history for `recentAtHotspot` / `notableInBox`).
