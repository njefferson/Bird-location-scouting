// =============================================================================
// CHANGELOG — single source of truth for release notes.
// =============================================================================
// Rendered in-app under About → "What's new", mirrored into /CHANGELOG.md, and
// published to GitHub Releases. Newest release first. The `version` matches the
// service-worker cache name (sw.js `CACHE = 'frame-v<n>'`) so a user can tell
// which build they're running. Keep entries short and user-facing.
// =============================================================================

export const CHANGELOG = [
  {
    version: 'v23',
    date: '2026-07-14',
    changes: [
      'The 0–100 “photographer’s score” is gone. It always hid one subjective call — a hand-picked guess at how “shootable” each bird is — inside a single number. In its place, each hotspot now shows a row of bird-group icons: waders, raptors, songbirds, waterfowl, shorebirds and more. An icon is bright when that group is really there this month, subdued when it’s scarce, faint when it’s absent — straight from eBird checklist frequencies. The headline on each card is now honest and countable: how many species you’d likely run into.',
      'Tap an icon to filter. One tap wants that group (only these), tap again to exclude it (never these), once more to clear — one gesture, one undo. It works right on the cards, or open the full picker to filter by bird type, by size (from a tiny songbird up to condor scale), by nest style, or by behaviour (poses in the open vs. skulks in cover). A standing bar shows when a filter’s on, with a one-tap “Show all birds”.',
      'A dashed icon means the numbers behind it are still the habitat/season model, not real eBird data — an honest sketch, never dressed up as fact. The icons are a likelihood of running into a bird, not a promise of a photo.',
      'Everything composes: your target list, “New for me”, and the new icon filters all narrow the same ranking together. The Shoot Now / Underrated / Be the Documenter / Skip-Thin views stay, now built on how present the birds are and how well-covered the spot is.',
    ],
  },
  {
    version: 'v22',
    date: '2026-07-14',
    changes: [
      'Starring a bird is just information now. Star the birds you want and Frame tells you WHERE and WHEN to find each one — the best hotspots and its peak months in your region — right on your target list. Starring no longer quietly re-ranks your hotspots: your list is a set of tips, not a verdict.',
      'Still want your list to steer the ranking? One optional toggle — “Rank hotspots by presence” — sorts the hotspots by how often your target birds actually turn up (frequency only; how easy a bird is to shoot no longer enters when you’re ranking by your list). A standing ★ bar tells you when it’s on, with a one-tap “Show all birds”.',
      'New — Birds I’ve seen: keep a life list of the birds you’ve already got. Mark a bird from its species page, any hotspot’s species table, or the new list screen — or paste/import a whole list at once to seed it fast. Seen birds stay visible everywhere, just dimmed, and still count toward every hotspot’s photographer score.',
      'New — “New for me” mode: flip it on and the ranking counts only the birds you haven’t photographed yet, so the map points you at lifers. It never changes the normal photographer score — a standing ✦ bar shows when it’s on, with the same one-tap exit. Both your lists live on this device and work offline, like the rest of the app.',
    ],
  },
  {
    version: 'v21',
    date: '2026-07-14',
    changes: [
      'Pick your own target birds: choose the species you actually want to photograph and the whole ranking re-weights to YOUR list. Star a bird from its species page, the Species tab, or any hotspot’s species table — and the hotspot ranking, the year planner and the map all start scoring only your birds.',
      'A new Target birds picker (from the Species tab or Settings) lets you browse every curated bird grouped by habitat, filter by name, and star the ones you want. Your list lives on this device — no account, and it works offline like the rest of the app.',
      'Your list, your ranking — and honest about it: with targets on, a standing ★ bar on the Ranking, Planner and Map says so, and tapping any score shows “Ranking your N target birds”, with only your chosen species counting. Photoability still weights your list, so an easy target ranks a spot above a hard one.',
      'A one-tap exit that never loses your picks: “Show all birds” on the ★ bar (or the toggle in Settings) flips back to the full ranking and keeps your list intact for next time.',
    ],
  },
  {
    version: 'v20',
    date: '2026-07-14',
    changes: [
      'The county map has grown up: rivers, lakes, major roads and parks now sit beneath the counties — and they’re named (river names, highway shields, park and lake names) so you can actually get your bearings, not just see anonymous lines. Every county is labelled too. On the statewide picker the landmark names stay hidden until you pinch in, so it never turns into a wall of labels. It all works offline — no connection needed in the field.',
      'The reservoirs and the birding refuges are on the map too: Folsom Lake, Lake Natoma, Camanche and some forty more, plus Cosumnes River Preserve, Yolo Bypass, Gray Lodge and the wildlife refuges up and down the valley. Each one’s position is checked against its county before it ships, so a label can’t drift.',
      'Roads draw in their own clay red — a colour nothing else on the map uses — so they can’t be mistaken for county lines, and their number sits in a matching red pill on the road itself. Only major routes get a number, and county names sit lighter so the landmarks come forward.',
      'The Maps buttons were quietly broken — Google had stopped understanding the old link format and could drop you at a similarly-named road 40 km away. Fixed, verified, and there are now TWO buttons on every hotspot: Apple Maps and Google Maps, each opening a pin at the hotspot’s exact coordinates.',
      'Zoomed all the way in, the map used to become a wall of giant text and blob-sized dots. Labels and pins now stop growing once you zoom past the opening view and hold a steady, readable size — and when you zoom in far enough, every hotspot dot shows its name, so you know which pin is which spot before you tap.',
      'The map answers at its zoom limit with a little rubber-band bounce instead of silently ignoring the pinch, panning and zooming are smoother, and the bottom tab dock sits on its own brighter surface so it stands off the page.',
      'You can finally SEE the lakes: real shorelines for the labelled reservoirs — Folsom, Ice House, Union Valley, Jenkinson and the rest — traced from OpenStreetMap and verified against their counties before shipping. (Shoreline data © OpenStreetMap contributors.)',
      'County lines are now black and dashed — a man-made boundary should look like one, instantly distinct from the red roads and blue rivers. And you can zoom MUCH further in: deep enough that Ice House Reservoir alone fills the screen (10× the old limit), with shorelines re-traced finely enough to stay smooth there; the county picker zooms 3× deeper too.',
      'The map now tracks your finger exactly (it used to move only about half as far as your drag — an invisible letterbox was throwing the math off), pinch zooms on the point between your fingers, and deep zoom stopped lagging: anything off-screen simply stops rendering. Past about 50× the labels step aside entirely and pins fade to rings, so a lake can just be a lake.',
      'A new Aa button on every map cycles the map text between Small, Medium and Large, remembered on this device — and the default is bigger than it was, as are the landmark markers.',
      'El Dorado, Placer, Sacramento and Humboldt counties are now set to carry EVERY eBird hotspot (184, 216, 359 and 585 instead of 40 each) — so field spots like Ice House Reservoir make the cut. The hotspots themselves arrive with the next quarterly data refresh.',
      'Selecting a county now clearly recolours it and draws a full, unbroken outline on top, so your region reads as one solid block instead of a patchwork with gaps in the borders.',
      'A colour key now sits under both the hotspot map and the year planner, and both read the same way at last: fuller colour = higher score. (The map used to say “brighter”, the planner “darker” — for the very same thing.)',
      'Tap any score — on a ranking card or a hotspot page — to see exactly what it means and how it was worked out: the species behind it, each one’s frequency × photoability, and how thin eBird coverage was discounted.',
    ],
  },
  {
    version: 'v19',
    date: '2026-07-13',
    changes: [
      'A fresh “Field Notebook” look: warm, paper-toned colours with the IBM Plex type family — a serif for names and titles, and a monospace for every number so scores and frequencies line up cleanly.',
      'New Dawn Mode: a warm dark theme for pre-dawn scouting and dark rooms. Tap the moon/sun button in the top-right corner from any screen to switch (also under Settings → Appearance); your choice is remembered on this device and applied instantly, with no flash on open.',
      'Crisper tab icons — hand-drawn line symbols for Ranking, Planner, Map, Species and Settings in place of the old glyphs.',
      'Same rankings, same data, same everything else — this is a visual refresh only.',
    ],
  },
  {
    version: 'v18',
    date: '2026-07-06',
    changes: [
      'Auto-switch now offers an Undo: when the app hops to the region you’re standing in, the notice has an Undo button that puts you right back where you were.',
      'Undo for the county picker’s Clear — wipe your selection by accident and a tap brings every county back.',
      'Deleting a saved region can be undone too: a “Deleted …” notice restores the region (and re-selects it if it was active) if you tap Undo.',
      'The hotspot Map tab now shows the surrounding counties as a quiet backdrop instead of near-black — the region you’re in still stands out, but you can see where it sits.',
      'The county picker shows a standing “Tap counties to build your region” indicator so it’s always clear you’re building a set and how to finish.',
      'Empty regions and broken share links now explain themselves and offer a way forward instead of showing a blank screen.',
    ],
  },
  {
    version: 'v17',
    date: '2026-07-05',
    changes: [
      'New Map tab: every hotspot in the active region pinned on the county map, opening zoomed to your region. Pin brightness follows this month’s photographer score — tap a pin to open that hotspot.',
      'Location auto-switch (off by default, in Settings): when enabled, the app notices which of your regions you’re standing in on open and switches to it.',
      'Share any region as a link (Settings → Share): opening it on another device drops its counties into the picker, ready to save. Handy for moving regions between iPad and phone.',
      'The live-sightings search radius now scales with the size of the active region (25–50 km) instead of a fixed 30 km circle.',
      'The county picker now says how deep each county’s hotspot data goes.',
    ],
  },
  {
    version: 'v16',
    date: '2026-07-05',
    changes: [
      'Settings cleaned up: the leftover “box” coordinates section is gone (regions cover that now), and the data-provenance details moved into the Regions section.',
      'The species pages’ live “last reported at…” line now searches around your active region, not always the Sacramento area.',
      'Removed the never-used “edge” chip and freshened region-era wording throughout (search subtitle, badge tooltips, the ⓘ panel).',
    ],
  },
  {
    version: 'v15',
    date: '2026-07-05',
    changes: [
      'Icon fix: the bird’s tail had detached when its posture straightened in v14 — it’s reattached and follows the body now.',
    ],
  },
  {
    version: 'v14',
    date: '2026-07-05',
    changes: [
      'Region switcher: pills at the top (Home, Humboldt, and up to 3 of your own regions) — one tap moves the whole planner to that region.',
      'County picker map: a pinch-zoomable map of California plus the Tahoe/Reno counties. Tap counties to select them (mirrored by an alphabetical checklist), name the set, and save it as a region. Every county already has bar-chart data, so any selection works instantly.',
      'Manage your saved regions from Settings → Regions (edit or delete). Your regions live on this device.',
      'The live “seen recently” overlay now follows the active region instead of always centering on the Sacramento box.',
    ],
  },
  {
    version: 'v13',
    date: '2026-07-05',
    changes: [
      'After an update, the app now shows this one-time “What’s new” pop-up — once per release, then never again.',
      'New app icon: a golden-hour wetland scene — bird perched on a branch, reeds, a dock and the setting sun, all inside the viewfinder.',
    ],
  },
  {
    version: 'v12',
    date: '2026-07-04',
    changes: [
      'Groundwork for multiple regions: the planner now loads its hotspots from per-county data files, so it can cover the coast (Humboldt) and the mountains, not just the Sacramento box. No visible change yet — the region switcher and county picker come next.',
      'The ⓘ panel now shows a “Coming next” roadmap of planned features, above “What’s new”.',
      'The quarterly data refresh now pre-builds every California county (plus the Tahoe/Reno ring), so any county added to a region later already has real bar-chart data waiting.',
      'Expanded the species list from 55 to 173, adding coastal (shorebirds, gulls, seabirds), Central Valley waterfowl/marsh, and Sierra/Tahoe montane birds — all rated for the same 375mm reach.',
      'Species codes now come straight from the eBird taxonomy at build time instead of being hand-typed, so the wrong-code bug that hid data can’t happen again.',
      'A bird that eBird has never reported at a hotspot now reads as a true zero, not an “inferred” estimate — more honest, and it clears the stray “inferred” chips on well-covered hotspots.',
    ],
  },
  {
    version: 'v11',
    date: '2026-07-03',
    changes: [
      'Fixed wrong eBird species codes for 8 birds — their ↗ eBird links now open the right page and their live “seen recently” badges can light up. (Golden-crowned Sparrow was even showing Golden-crowned Kinglet sightings.)',
      'Installed apps now pick up new data and fixes automatically on the next couple of loads — no more waiting on a version bump.',
      'Proper iOS home-screen icon (PNG — iOS ignores SVG touch icons).',
      'The “seen Nd ago” badge now explains it means anywhere in the box, not necessarily at that hotspot.',
      'Renamed Black-crowned Night-Heron to “Black-crowned Night Heron” to match eBird — its real frequency data will load on the next data refresh.',
    ],
  },
  {
    version: 'v10',
    date: '2026-06-28',
    changes: [
      'The in-app “What’s new” now shows the latest 5 releases with a link to the full changelog.',
    ],
  },
  {
    version: 'v9',
    date: '2026-06-28',
    changes: [
      'Added this “What’s new” panel — release notes now live in the app, in CHANGELOG.md, and on GitHub Releases.',
    ],
  },
  {
    version: 'v8',
    date: '2026-06-28',
    changes: [
      'The “inferred” tag now shows how many species are estimated (e.g. “1 inferred”) and disappears when a hotspot’s photographable birds are all real eBird data.',
      'Renamed the coverage badge from “N: 73” to “73 checklists”, with a plain-language explanation on hover.',
    ],
  },
  {
    version: 'v7',
    date: '2026-06-28',
    changes: [
      'The Ranking now lists every hotspot, not a capped top-N (removed the list-length setting).',
    ],
  },
  {
    version: 'v6',
    date: '2026-06-28',
    changes: [
      'Tap a bird’s name to open its Species page (with an external ↗ eBird link kept there).',
      'Sparklines gained a J–D month axis and faint month gridlines.',
    ],
  },
  {
    version: 'v5',
    date: '2026-06-28',
    changes: [
      'Added the ⓘ About panel explaining the photographer-first scoring.',
    ],
  },
  {
    version: 'v1',
    date: '2026-06-28',
    changes: [
      'Initial release: real eBird frequency + checklist data for 30 Sacramento-area hotspots, a live “seen recently” overlay, year planner, species search — installable and offline-capable.',
    ],
  },
];
