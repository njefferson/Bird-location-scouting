# Standing rules for Claude sessions on this repo

These are non-negotiable operating rules, learned the hard way. They apply to
every session, every model, every time.

## 1. Verify before delegating — NEVER send the user on a goose chase
Do not hand the user a manual step unless you have either (a) verified that
exact step end-to-end from your side, or (b) proven it is impossible to do or
verify yourself. Test assumptions server-side FIRST (e.g. the `probe` command
in build-counties.mjs settled the cookie question in 15 seconds — build the
probe BEFORE writing human instructions, not after burning the user's
attempts). UI instructions for browsers/apps you cannot see are assumptions,
not facts. The user's time is expensive; runner time and your time are free.

## 2. Never ask the user to click "Run workflow"
Every workflow here is push-to-trigger: commit a change to
`.github/trigger/<workflow-name>` on a `claude/*` branch and push — the
matching workflow fires. Plain `git push` is the one channel that always works
from the sandbox, independent of the GitHub MCP connection and the Actions UI.
For the data refresh, `[resume]` in the trigger commit message = resume mode.

## 3. The user's on-device acceptance pass is a HARD GATE
(Adopted 2026-07-05 from the user's written working rules; v14–v17 shipped
straight to production before this existed — don't repeat that.)
- Never merge a product change to main (= production deploy) without the
  user's explicit go on his actual device.
- Staging mechanism that already exists: push the finished candidate branch to
  `staging` — deploy.yml publishes a Cloudflare PREVIEW at
  https://staging.bird-location-scouting.pages.dev, production untouched.
  Hand over that URL, wait for the go, then PR + merge to main. (This branch was
  called `next-version` through v18; renamed to `staging` 2026-07-13.)
- LEAVE A DURABLE "WAITING ON NOAH" SIGNAL (learned 2026-07-13, the hard way):
  a candidate on `staging` that the acceptance pass never reaches is
  invisible once the session ends. On 2026-07-06 a finished v18 sat there for a
  week; a later session, seeing only main (still v17), rebuilt a parallel v18
  and nearly clobbered it. So the moment you push to `staging`, ALSO open a
  DRAFT PR from that branch to main titled "vN — awaiting on-device acceptance",
  with the VERIFIED / NEEDS-HIS-HANDS notes in the body. That draft PR is the
  handoff that survives the session. Merge it (undraft) only after the go.
- START EVERY UPDATE BY CHECKING FOR A STAGED CANDIDATE FIRST: `git fetch`, then
  compare `staging` to `main` and list open PRs. If `staging` is ahead
  of `main`, or an "awaiting on-device acceptance" PR exists, that candidate is
  already waiting on Noah — surface it and continue/hand it off; do NOT start a
  fresh parallel version or reuse a version number it already claims.
- Docs-only changes (this file, HANDOFF.md) may merge without the gate.
- Always state what was VERIFIED (headless Chromium, request inspection)
  versus what still NEEDS HIS HANDS: real pinch on iPad Safari, share sheet,
  geolocation permission flow in the installed PWA, tap-target feel.
- No drafts or pseudo-code; iterate privately, deliver finished work.
- Changelogs and commit messages are written for the END USER.

## 4. The user is iPad-first and often driving
No desktop-required steps unless every alternative is exhausted, and never
more than one step at a time. Known hard constraint: the eBird session cookie
is HttpOnly — `document.cookie` (and therefore any bookmarklet) can NEVER
capture it. The only way is desktop DevTools → Network → any ebird.org request
→ Request Headers → copy the `cookie:` value. eBird's bar-chart endpoint was
PROVEN login-gated (probe, 2026-07-05); don't re-litigate it.
- ALSO SETTLED — do not re-offer (a session re-suggested it 2026-07-14 and was
  corrected by the user): storing his eBird username/password as secrets so a
  runner logs in automatically is AGAINST eBird's terms and policies. The
  manual cookie from his own signed-in browser session is the only acceptable
  path; it is quarterly and takes a minute. Never propose credential
  automation for eBird again.

## The user's product taste (from his written summary, 2026-07-05)
- Visuals: maximum saturation, gentle contrast, shadows alive — never crush
  shadow detail for punch.
- Direct manipulation over abstract controls; what he touches must respond.
- Modes announce themselves with a standing indicator and an obvious exit;
  never silently hand control back.
- One gesture = one undo step; undo fully unwinds. No destructive action
  without an unwind path.
- Labels stay honest; every failure explains itself and offers a way forward.
- Product values: free, on-device, offline-first, no account, no install.

## APPROVED next-release plan — "Bird lists" evolution (locked with Noah
## 2026-07-14; he said "just capture the plan", so DO NOT BUILD until he says
## "begin next release"). This is direction, not a taste-guess — build to it.
- REWORK the v21 stars so they are INFORMATIONAL, not "judged". Noah's exact
  words: "Starred species shouldn't be 'judged,' only info given." He chose
  "Both, as two modes":
  1. DEFAULT: starring a bird just gives INFO — surface its where/when (best
     hotspots + months) on the user's list; it does NOT rerank hotspots and
     photoability never enters.
  2. OPTIONAL TOGGLE: also rank hotspots by PRESENCE (frequency) of the starred
     birds — presence only, NEVER photoability. (This deliberately REVERSES the
     v21 behavior, where targets are photoability-weighted. See the v21 note in
     Project facts: v21 shipped judged; next release un-judges by default.)
- NEW "lifer" / seen list: users record every bird they've already seen so they
  can focus on new ones. Behavior = "DIM BUT KEEP VISIBLE" (Noah's pick over
  "filter out of scoring"): seen birds stay in every list/matrix but greyed,
  and are excluded ONLY from a dedicated "new birds" view — NOT removed from the
  global photographer score. Think about bulk-importing a life list, and
  per-region vs global scope, but confirm those interactions before committing.
- "Possibly other things off of that" (Noah) — open-ended; confirm before adding.

## Backlog (taste-derived candidates, NOT yet user-approved as roadmap —
## confirm before building; don't add to frame/src/data/roadmap.js until then)
- Month scrubbing by dragging across sparklines/matrix (direct manipulation).
- Review the IRstudio repo for the user's UI patterns (see session-scope note).
## Shipped from this backlog (don't rebuild):
- v21 (2026-07-14): "Pick your own target birds" — see Project facts. NOTE its
  targets ARE photoability-judged; the approved next release reverses that.
- v18 (2026-07-13): auto-switch Undo; Undo for region delete and picker Clear;
  `.far` counties lifted off the map background; dead-end rescue for empty
  regions and broken import links.

## Project facts (verified, don't rediscover)
- Session repo access is FIXED at session creation. add_repo/list_repos hang
  on an approval that never surfaces on iPad, the GitHub MCP hard-denies
  unlisted repos, and the sandbox proxy intercepts even public github.com
  fetches. To work with IRstudio (or any second repo), the user must select it
  in the source picker WHEN CREATING the session. Verified 2026-07-05.
- App: `frame/` PWA, no build step; deploys to bird-location-scouting.pages.dev
  via `.github/workflows/deploy.yml` on push to main (previews: staging).
- v21 shipped 2026-07-14: "Pick your own target birds". On-device target list
  (localStorage `frame.targets` = species common names, `frame.targetsOn` = the
  standing engage toggle); `model/targets.js` exposes `activeSpecies()` which
  EVERY rank call site now passes as `rankHotspots(..., { species })` (cards,
  matrix, mapview, hotspot detail). Picker at `#/targets` (`ui/targets.js`):
  all species grouped by dominant habitat, name filter, star toggles, count +
  Clear. Reusable `starButton()` also on species pages (`.sp-head`) and every
  hotspot species-matrix row (`.star-cell`). Standing `.targetbar` on the ranked
  views with a non-destructive "Show all birds" exit; Settings "Target birds"
  section; `scoreinfo.js` shows a `.si-targeting` note when active. IMPORTANT:
  v21 targets are photoability-WEIGHTED (an easy target ranks a spot higher) —
  the APPROVED next release deliberately makes stars informational-by-default
  instead (see the next-release plan above).
- v19 shipped 2026-07-13: "Field Notebook" reskin. All colors are :root tokens
  in styles.css with a `[data-theme="dark"]` Dawn Mode override — restyle by
  swapping tokens, never hex-in-place. Theme state lives in ui/theme.js
  (floating moon/sun button + Settings checkbox + localStorage `frame.theme`
  + theme-color meta, all synced; a <head> boot script in index.html applies
  the stored theme pre-paint). IBM Plex Sans/Serif/Mono load from Google Fonts
  in index.html; mono is used for EVERY number. Tab icons are inline SVGs in
  main.js TABS. Trust badges color via `.badge.trust-<key>` theme tokens (the
  hexes in scoring.js TRUST are reference only). On wide screens everything
  aligns to the 760px column: the tab bar is a floating dock (same width/
  radius/border as cards) and the corner buttons hug the column edge.
  Known pre-existing wart (NOT from v19): the sticky month/filter header fades
  to transparent at its bottom, so scrolled card titles can collide with the
  filter-hint text — a fix was offered but not yet requested.
- v18 shipped 2026-07-13: reversibility pass — the toast() helper (ui/dom.js)
  gained an optional `action` button (Undo); wired into auto-switch (main.js),
  region delete (model/regions.js `deleteRegion` returns `{removed, wasActive}`)
  and picker Clear (ui/regionpicker.js). Plus `.far` map counties lifted via a
  new `--far` token, dead-end states (ui/views.js `regionDeadEnd`), and the
  picker's standing `.pick-mode` indicator.
- v17 shipped 2026-07-05: region switcher pills, county-picker map, hotspot
  Map tab, location auto-switch (opt-in), region share links (#/import),
  overlay radius 25–50 km by region spread. Saved regions live in
  localStorage (`frame.regions`, max 3). Key modules: ui/mapview.js,
  ui/panzoom.js (shared pan/pinch), ui/regionpicker.js, model/geo.js
  (lat/lng→map projection + point-in-county), data/county-shapes.js
  (generated by scripts/gen-county-shapes.mjs — exports MAP_PROJECTION).
- Field-found gotchas: SVG pointer-capture redirects native clicks — resolve
  taps in pointerup via elementFromPoint (never per-element click handlers on
  the map). The icon bird FACES LEFT (beak left, tail right); its tail is a
  separate path outside the body group — both must share the same rotate()
  pivot. Regenerate apple-touch-icon.png (headless Chromium screenshot of
  icon.svg) whenever icon.svg changes.
- Data: per-county files `frame/data/counties/US-XX-###.json` + committed
  `frame/data/taxonomy.json` (NEVER gitignore it — it shipped broken once).
  Species codes are derived from names via eBird taxonomy, never hand-typed.
- Refresh: `refresh-data.yml`, quarterly cron + push-trigger; needs
  EBIRD_API_TOKEN + EBIRD_COOKIE secrets. Fails fast (~2s) on a dead cookie;
  partial progress is committed; resume skips built counties.
- Releases: auto-published from CHANGELOG.md top section on merge to main.
  Version = service-worker CACHE name (`frame-v<n>`); bump both together.
- `keepalive.yml` commits a monthly heartbeat so GitHub's 60-day inactivity
  rule can never pause the scheduled workflows.
- Git: work on the designated `claude/*` branch; PR + merge to main; a
  branch whose PR merged must be restarted from origin/main.
