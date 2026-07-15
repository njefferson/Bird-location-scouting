# Frame v23 — Design review brief (icons + interface)

> **⚠ HISTORICAL — do NOT action.** This is the design brief that produced v23
> (July 2026); the app is well past it (v25+). Its instructions below (freezing
> production, "paste into a fresh session to run the review", repo-access steps)
> are stale and must not be followed — treat this file as an archived record of
> the v23 redesign, not a live task. Current standing rules live in `/CLAUDE.md`.

> _(Original brief follows, unchanged for the record.)_

---

## 1. What you're reviewing

**Frame** is an offline-first PWA that ranks bird-photography hotspots. v23 just
replaced a subjective 0–100 "photographer's score" with something more honest:
each hotspot shows **which kinds of birds are actually there this month**, as a
row of tappable **facet icons**, and those icons double as filters.

There are **25 hand-drawn line icons** across four facets. They were authored
quickly, without a design eye — **that is exactly what needs your review.** The
interface around them (cards, the hotspot detail, the filter picker, the
standing filter bar) also changed a lot and is fair game.

The four facets:
- **guild** (12) — bird type: waders, waterfowl, raptors, shorebirds, gulls/
  seabirds, gamebirds, doves, woodpeckers, swallows/swifts, hummingbird,
  kingfisher, songbirds.
- **size** (5) — by wingspan: tiny songbird → small → medium → large → very
  large (condor scale). Same silhouette at five stepped scales.
- **nest** (5) — Wingspan-boardgame style: bowl, cavity, ground, platform, wild.
- **behavior** (3) — field presentation: in-the-open, in-and-out, skulker.

How they appear:
- On each **hotspot card**, the 12 guild icons form a row. An icon is **bright**
  when that group is really present this month (from real eBird frequency),
  **subdued** when scarce, **faint/ghost** when absent — and **dashed** when the
  number behind it is still a model, not real data.
- **Tap** any icon to filter: neutral → **wanted** (ring + ✓) → **excluded**
  (red diagonal slash) → neutral. One gesture, one undo.
- A **picker dialog** shows all four facets as tri-state tiles.
- On the **hotspot detail** page, each species row shows its four facet icons
  (type · size · nest · behavior) as small informational glyphs.

---

## 2. The icon contract (so your revisions are drop-in)

This is a **no-build app**. Icons live as **inline-SVG inner markup strings**
(paths only — no `<svg>` wrapper) in `frame/src/data/facets.js`. They are wrapped
at render time by:

```js
function facetSvg(inner, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
```

So every icon:
- draws in a **24×24 viewBox**;
- is **stroke-based**, `stroke="currentColor"`, `stroke-width: 1.7`, round caps/
  joins, `fill="none"` by default (a glyph may set its own `fill="currentColor"
  stroke="none"` on a path — the size icons do, being filled silhouettes);
- **inherits colour from CSS** (the state classes below drive it) — so **never
  hard-code colours** in a path;
- must read at **22px** (card rows, species table) and **44px** (picker tiles),
  and stay legible in **greyscale** (see §4).

**When you revise an icon, return the inner-markup string only** — it drops
straight back into `facets.js`. Keep the 24×24 / stroke-1.7 contract so it
matches its neighbours.

---

## 3. The 25 icons — current source

Copy any of these into a 24×24 stroke SVG to see them. `stroke-width="1.7"`,
`fill="none"`, round caps.

### Guild (12) — bird type
| key | label | inner SVG |
|---|---|---|
| `wader` | Waders | `<path d="M20 5.4 17 5q-4 1.6-3 5"/><ellipse cx="13.6" cy="12.4" rx="2.4" ry="1.7"/><path d="M12.6 14l-1 6M14.8 14l.6 6"/>` |
| `waterfowl` | Waterfowl | `<path d="M4 18h16"/><path d="M5 15q1 3 6 3 5 0 6-4"/><circle cx="17" cy="11" r="1.6"/><path d="M18.5 11.4 21 12"/>` |
| `raptor` | Raptors & owls | `<path d="M3 12c4 .4 5-2.6 9-2.6s5 3 9 2.6"/><path d="M12 9.4V7"/><path d="M12 9.4v3.4"/>` |
| `shorebird` | Shorebirds | `<circle cx="11.5" cy="10" r="2.2"/><path d="M13.4 8.7q3 .3 3.6 3.4"/><path d="M10.5 12l-.6 6M12.5 12l.6 6"/>` |
| `seabird` | Gulls & seabirds | `<path d="M3 9q4.5 2.6 9 0M21 9q-4.5 2.6-9 0"/><path d="M4 16q8 3 16 0"/>` |
| `gamebird` | Gamebirds | `<path d="M6 18q0-6 6-6 5 0 5 5"/><path d="M6 18h11"/><circle cx="15" cy="9.6" r="1.4"/><path d="M15 8.2q1.2-2 0-3.6"/>` |
| `dove` | Doves & pigeons | `<ellipse cx="12" cy="12" rx="4" ry="2.6"/><circle cx="16.4" cy="9.8" r="1.5"/><path d="M8 12 4.5 15"/><path d="M4 18h16"/>` |
| `woodpecker` | Woodpeckers | `<path d="M7 4v15"/><path d="M7 9q5-1 5 3.2 0 3-3 3.6"/><path d="M7 9 4.6 7.4"/>` |
| `aerial` | Swallows & swifts | `<path d="M12 9q-6-3-9 .5M12 9q6-3 9 .5"/><path d="M12 9 9.8 15 12 13.2 14.2 15z"/>` |
| `hummingbird` | Hummingbird | `<ellipse cx="13" cy="12.5" rx="2.4" ry="1.5" transform="rotate(-18 13 12.5)"/><path d="M15 10.6 19.5 8"/><path d="M9.5 13.4 6.5 16"/><path d="M8.6 10.4q-2 2.2 0 4.4"/>` |
| `kingfisher` | Kingfisher | `<path d="M9 8q4.4-1 5.4 3.2Q15 15 12 17"/><path d="M9 8q-1-1.8 0-3.4M11.2 6.8q0-2 1.1-3.4"/><path d="M9 10 4.6 9"/>` |
| `songbird` | Songbirds | `<path d="M9 16q0-5 4-5 3 0 3 3l3-2-2 3q0 3.4-4 3.4"/><path d="M8.4 11 6.2 9.2"/><path d="M11 18.4v-1.8M13 18.4v-1.8"/>` |

### Size (5) — by wingspan
One filled silhouette scaled five ways. The silhouette:
```
SIZE_BIRD = '<path fill="currentColor" stroke="none" d="M4 13.2c0-3 2.1-5 5-5 1.6 0 2.9.7 3.7 1.8L18 8.2l-3.6 3.2c.3.6.5 1.3.5 2 0 2.9-2.4 4.2-5.2 4.2C6.9 17.8 4 16.4 4 13.2z"/>'
```
wrapped as `<g transform="translate(12 13) scale(K) translate(-11 -13)">SIZE_BIRD</g>`:

| key | label | scale K | band |
|---|---|---|---|
| `xs` | Tiny | 0.40 | wingspan < 25 cm (hummingbird, kinglet) |
| `s` | Small | 0.58 | 25–45 cm (sparrow, phoebe) |
| `m` | Medium | 0.76 | 45–90 cm (crow, duck, quail) |
| `l` | Large | 0.94 | 90–150 cm (egret, hawk, goose) |
| `xl` | Very large | 1.14 | > 150 cm (eagle, pelican, crane, condor) |

### Nest (5) — Wingspan-style
| key | label | inner SVG |
|---|---|---|
| `bowl` | Bowl | `<path d="M5 12.5q7 6 14 0"/><path d="M5 12.5q0-2 2-2M17 10.5q2 0 2 2"/><circle cx="10" cy="13.4" r="1"/><circle cx="13.2" cy="13.6" r="1"/>` |
| `cavity` | Cavity | `<rect x="7" y="3.5" width="10" height="17" rx="1.4"/><circle cx="12" cy="11" r="2.8"/>` |
| `ground` | Ground | `<path d="M4 17h16"/><path d="M7 17q5 3 10 0"/><circle cx="11" cy="16" r="1"/><circle cx="13.5" cy="16.2" r="1"/>` |
| `platform` | Platform | `<path d="M4 14h16M5.5 17h13"/><path d="M6.5 14 5.5 17M12 14v3M17.5 14l1 3"/><circle cx="10" cy="12.6" r="1"/><circle cx="13" cy="12.6" r="1"/>` |
| `wild` | Wild card | `<path d="M12 4l2.3 4.8 5.2.6-3.9 3.6 1 5.1L12 15.9 7.4 18.7l1-5.1L4.5 9.4l5.2-.6z"/>` (a star) |

### Behavior (3) — field presentation
| key | label | inner SVG | metaphor |
|---|---|---|---|
| `open` | In the open | `<path d="M2.5 12q9.5-7.5 19 0M2.5 12q9.5 7.5 19 0"/><circle cx="12" cy="12" r="3"/>` | an open eye |
| `mixed` | In and out | `<path d="M2.5 12q9.5-7.5 19 0"/><path d="M2.5 12q9.5 7.5 19 0" stroke-dasharray="2.4 2.4"/><circle cx="12" cy="12" r="2.6"/>` | half-dashed eye |
| `skulker` | Skulker | `<path d="M12 20.5v-6.5"/><path d="M12 14q-5.5 0-6.5-5.5Q11 8.5 12 14zM12 14q5.5 0 6.5-5.5Q13 8.5 12 14z"/>` | hidden in leaves |

---

## 4. The state visual language (must survive greyscale)

Icons are never distinguished by colour alone — colour-blind and Dawn-Mode safe.
Each channel is orthogonal so they can stack (e.g. a lit-but-modeled icon that's
also excluded):

| State | Channel | Current treatment |
|---|---|---|
| Presence **none** | glyph colour + bottom bar | ghost colour, a short **dotted** bottom bar |
| Presence **some** | " | subdued colour, a short **solid** bottom bar |
| Presence **lots** | " | full accent colour, a **wider solid** bottom bar + faint fill wash |
| **Inferred** (modeled) | glyph stroke | **dashed** stroke (`stroke-dasharray`) |
| **Wanted** filter | button chrome | inset **ring** + a **✓** top-right |
| **Excluded** filter | button chrome | **red diagonal slash** + dimmed |

CSS tokens (in `frame/src/styles.css`, both light + `[data-theme="dark"]`):
```
--facet-lots   = accent (saturated amber)
--facet-some   = 52% accent mixed toward dim
--facet-ghost  = 40% dim, transparent
--facet-want   = accent
--facet-block  = #a0472f light / #e8795a dark  (the exclude red)
--facet-mode   = park green  (the filter-bar identity, distinct from gold
                 targets / slate seen)
```
The tap target is **44×44px** (`.fi`). Icon glyph is 22px inside it.

---

## 5. Noah's product taste (the bar to hit)

- **Maximum saturation, gentle contrast, shadows alive** — never crush shadow
  detail for punch.
- **Direct manipulation** over abstract controls — what you touch responds.
- **Modes announce themselves** with a standing indicator and an obvious exit.
- **One gesture = one undo step.**
- **Honest labels** — every state explains itself; the icons are a *likelihood*
  of seeing a bird, never a promise of a photo.
- **iPad-first, often one-handed** — ≥44px targets, no fussy precision.
- **Field Notebook** aesthetic: warm paper palette, IBM Plex (serif titles, sans
  chrome, mono numbers). Dawn Mode is a warm near-black, never green-tinted.

---

## 6. What to critique (specific asks)

Please go facet by facet, then whole-interface. For each icon you'd change, give
the **revised inner-SVG string** and one line of rationale.

**Guild glyphs (the priority):**
1. Do all 12 read as **distinct birds** at 22px? The known collision risks:
   **raptor** (soaring M) vs **seabird** (gull) vs **aerial** (swallow) — three
   flying silhouettes; and **wader** vs **shorebird** — two leggy probers. Make
   each unmistakable.
2. Are any too abstract to name without the label (kingfisher, woodpecker)?

**Size ladder:** does the 5-step scale read as small→large, especially **xs vs
s** at 22px? Would a different encoding (e.g. a reference baseline, or a
small→big pair) read faster than a lone scaled silhouette?

**Nest icons:** are bowl / cavity / ground / platform / wild legible and
distinct? `wild` is a plain star — is that the right "misc/other" signal?

**Behavior metaphors:** eye / dashed-eye / leaves — do they communicate open /
in-and-out / skulker without the label? Propose better metaphors if not.

**Tri-state on a 44px target:** is level-bar + dashed + ring/✓ + slash **too
much at once**? Is the want/exclude cycle legible and learnable? Suggest a
cleaner encoding if you have one (keep it greyscale-safe and tap-cyclable).

**Card & layout:**
- The card head carries a 12-icon guild row **plus** trust/checklist tags **plus**
  an "N birds likely" chip. Is the **hierarchy** right? Too busy?
- Three **standing bars** can stack (New-for-me ✦ slate, Targets ★ gold, Filters
  ⛃ green). When several engage, do they crowd the top? Better consolidation?
- Colour in **both themes**: does the amber "lots" pop enough while staying
  within gentle-contrast taste? Is the exclude-red right in Dawn Mode?

**Deliverable from you:** revised inner-SVG strings keyed by icon key, plus any
CSS token/spacing deltas, each with a one-line rationale. See §7 for format.

---

## 7. How to return your work (so it applies in seconds)

Give me a block like this — I paste the strings straight into `facets.js` / the
tokens into `styles.css`:

```
## Guild
raptor:  <path .../>            # hooked-beak perched profile — reads distinct from the gull
seabird: <path .../>            # ...

## Size
(if changed) new scale steps or a new SIZE_BIRD path

## Nest / Behavior
skulker: <path .../>

## CSS tokens / spacing (optional)
--facet-block: #b34a30;         # deeper red, more visible on paper
.fi { ... }                     # any spacing/size tweak
```

Keep every glyph on the **24×24 / stroke-1.7 / fill-none** contract so it matches
its neighbours and needs no other change.

---

## 8. Repo access (optional — closes the loop directly)

If you want to edit the real files and push instead of handing back strings:
**when you create the session, pick the `njefferson/Bird-location-scouting`
repo in the source picker.** Then you can edit directly:
- Icons + vocab: `frame/src/data/facets.js`
- State/token CSS: `frame/src/styles.css` (search "FACET ICONS (v23)")
- Where icons render: `frame/src/ui/views.js` (`guildIconRow`, `speciesFacetRow`),
  `frame/src/ui/facetbar.js` (picker + bar)

Work on the branch **`claude/photo-ability-redesign-am4o00`** (do **not** touch
`main` — v23 is awaiting on-device acceptance; production must not move). It's a
no-build app: open `frame/index.html` on a static server to see changes live.

If you can't add the repo, just hand back the strings per §7 and they'll be
applied on that branch.
