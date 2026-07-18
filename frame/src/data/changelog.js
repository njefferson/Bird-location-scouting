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
    version: 'v41',
    date: '2026-07-18',
    changes: [
      'Every bird now shows its face. Where each species used to sit behind a small grey silhouette of its group, there’s now an actual photo — a rounded thumbnail — beside the name: in your target list, your life list, each hotspot’s species table, and a larger portrait on the species page. Tap any photo to open that bird’s page, the same as tapping its name. All 272 birds have one, each cropped to frame the bird; the silhouette only stands in for a moment before a photo has loaded.',
      'The photos come from Wikimedia Commons — freely-licensed images, each credited to its photographer under About → “Species photo credits”. (Not eBird’s photos: those belong to the people who took them and aren’t ours to bundle.) The whole set is about half a megabyte and loads quietly as you browse rather than all at once, so the app still installs light — and the silhouette always stands in when you’re offline and haven’t seen a bird’s photo yet.',
    ],
  },
  {
    version: 'v40',
    date: '2026-07-18',
    changes: [
      'Sharing the app now shows a proper preview. When you send the link in Messages, WhatsApp, Slack or post it anywhere, it now unfurls into a card — the Frame icon, the name, and the tagline — instead of a bare URL. (The page had no preview image or share tags before; now it does.)',
    ],
  },
  {
    version: 'v39',
    date: '2026-07-18',
    changes: [
      'Yellowstone birds now count. The app’s species list grew up in California, so on the Yellowstone maps a lot of northern birds were sitting in the data uncounted. This adds 99 Rocky-Mountain species — Trumpeter Swan, Barrow’s Goldeneye, Harlequin Duck, Dusky and Ruffed Grouse, Greater Sage-Grouse, the three-toed and black-backed woodpeckers, Boreal Owl, Calliope Hummingbird, the rosy-finches, Canada Jay, and the willow-and-sage songbirds — each with its type, size and habitat so it filters and ranks like every other bird. They were already in your downloaded data; now they show up in the counts, the rankings and the species search. (No new download — this just teaches the app to read what was already there.)',
    ],
  },
  {
    version: 'v38',
    date: '2026-07-18',
    changes: [
      'Yellowstone. The planner leaves California for the first time: a built-in “Yellowstone” region covering the park and its gateways — Mammoth, Lamar and Canyon in the northeast, Old Faithful and Yellowstone Lake, Grand Teton and Jackson to the south, West Yellowstone and Gardiner at the entrances, Island Park across the Idaho line. Every eBird hotspot in all five counties, with every species each one reports.',
      'The map knows the way there too: Yellowstone draws on its own map canvas — the five counties with the park boundaries, Yellowstone Lake, Jackson Lake, Hebgen Lake, the Yellowstone, Gallatin and Shoshone rivers, and the highway numbers, all offline like the California map. The two counties holding the park itself are stored on your device up front, so the region works with no signal at all — open the app once with a connection to pick this update up first.',
      'One honest note: the species list Frame ranks with grew up in California. Most Yellowstone birds are on it, but a few northern specialties aren’t counted yet — they’re in the downloaded data and will light up as the list grows.',
    ],
  },
  {
    version: 'v37',
    date: '2026-07-18',
    changes: [
      'Yosemite is now a built-in region. Tap the new “Yosemite” pill at the top to move the whole planner into the park — Yosemite Valley, Wawona, El Portal and Big Meadow on the west side, Tuolumne Meadows, Hetch Hetchy and Hodgdon Meadow up high. Like Home, it ships with the app and is stored on your device, so it works offline — which matters in a park where cell signal is thin. (Open the app once with a connection to pick up this update; after that it’s there without one.)',
      'Both Yosemite counties (Mariposa and Tuolumne) are now set to carry EVERY eBird hotspot, like Sacramento and Humboldt do — not just the top 15. The full pin set arrives with the data refresh that follows this release; open the app online once after and it’s on your device.',
    ],
  },
  {
    version: 'v36',
    date: '2026-07-18',
    changes: [
      'Navigation, reworked. Tap a hotspot card anywhere to open its location page — the whole card is the button now, so the old “Species matrix” button is gone.',
      'The map links moved to the location page, where they belong. Open a spot, then pick how you drive there: Apple Maps, Google Maps, or — new — Waze (it opens the Waze app if you have it, the Waze website if you don’t). On Android the location page also has an “Other maps” button that hands the spot to whatever map apps you’ve got installed. (iPhones and iPads don’t offer that kind of chooser to a web page, so there the named buttons are the way to pick.) Each one opens a pin at the hotspot’s exact coordinates.',
    ],
  },
  {
    version: 'v35',
    date: '2026-07-18',
    changes: [
      'Dropped the last of the access blurbs. A handful of well-known spots still showed a short “access” description — paved trails, day-use fees, where to park. Those were generic park summaries with no verified source behind them, and a wrong fee or a closed gate is the worst thing to be confident about when you’re deciding where to drive at dawn. So they’re gone. Getting-there is the Apple/Google Maps buttons on every hotspot, and the habitat chips (oak, lake, marsh…) tell you what kind of place it is. The app no longer states an access fact it can’t stand behind.',
    ],
  },
  {
    version: 'v34',
    date: '2026-07-17',
    changes: [
      'Honest access notes. Most hotspots used to show “no curated access notes for this hotspot yet” — a promise the app was never going to keep, since those notes are hand-written and most spots will never get one. That placeholder is gone: the Access button and note now appear only where a real, curated note actually exists (the well-known spots like the American River Parkway, Folsom, Effie Yeaw). Everywhere else, the Apple/Google Maps buttons are right there to get you there — no empty promise.',
    ],
  },
  {
    version: 'v33',
    date: '2026-07-17',
    changes: [
      'More accessibility polish, finishing the pass. The small print grew up: species-group captions, filter-picker state words, the “here this month” label and the category labels are now a readable size instead of sub-legible fine print. A “Skip to content” link appears when you Tab into the app, so keyboard users jump straight to the view. And the little 12-month trend graphs now describe themselves to a screen reader — “peaks in June” — instead of being a silent picture.',
    ],
  },
  {
    version: 'v32',
    date: '2026-07-17',
    changes: [
      'An accessibility pass, made a standing priority: nothing in Frame relies on colour alone anymore. The filter’s green and red counters now read “+2” / “−1” (the symbol carries the meaning, colour reinforces it), an excluded filter light wears the same slash as the pills, and the active tab carries a small bar under its icon rather than just a colour change.',
      'Text contrast is now measured, not eyeballed — every caption, legend, link and label was checked against the accessibility standard (WCAG AA) in both themes, and the quiet ones were deepened until they pass: captions and subtitles are a touch darker, links and section headers use the deeper ink, the bottom tab bar sits on a deeper taupe so its labels read in bright light, and the hot-spot orange was nudged imperceptibly for a firmer edge. The warm look stays; it’s just legible for everyone now.',
      'The keyboard works everywhere: a clear focus ring shows where you are (it was invisible on several controls), the planner’s sort-by-month headers and hotspot names are real buttons you can Tab to and press Enter on, and screen readers hear the little confirmation toasts. The map remains a pointer surface — the Planner is the keyboard path to the same spots, and the map now says so to assistive tech. Animations also respect your system’s reduced-motion setting.',
      'Fixed a long-standing scrolling glitch: the sticky header at the top of a screen used to fade to see-through at its lower edge, so rows sliding up behind it showed through and tangled with the icons. The header is solid now and the content fades out cleanly just beneath it.',
    ],
  },
  {
    version: 'v31',
    date: '2026-07-17',
    changes: [
      'The target-bird picker no longer opens as one long scroll. The habitat sections now fold: the browse list starts as a short, tappable index — each habitat shows how many birds it holds (and, if you’ve already starred any, a small camera tally) — and you unfold just the one you want. A “Browse by habitat” row up top expands or collapses everything in a tap, and each section remembers whether you left it open. Searching or tapping a facet icon still shows every match open and flat, as before.',
      'The filter now says what each category is doing at a glance: every category button carries a green circle counting the groups you’re requiring and a red circle counting the ones you’re excluding, so you can read “two required, one excluded” without opening it.',
      'That same filter is now on the Target birds screen. The Type / Size / Nest / Behaviour panel you know from Ranking sits above the species list there too, so you can narrow which birds you’re browsing the same way everywhere.',
      'The map and the year planner dropped the colour scale entirely. Reading a smooth ramp of shades never worked — most dots crushed together and the best spots didn’t stand out. Now there are just two kinds of spot: the places that have historically reported the most birds in the chosen month — the natural top tier of that month’s ranking, usually the top dozen or so, found where the scores actually break — wear a vivid orange dot (a little bigger, drawn on top), and every other spot is a quiet plain dot. The planner works the same way: an orange cell means that hotspot is historically among the strongest for that month. It’s past seasons’ reporting, not live sightings — the captions say so plainly. One glance, no key to study, and the map follows the light and Dawn themes again.',
      'The species search is fixed. Tapping the field now reliably shows a list you can pick from and lets you type to filter it — and you can always edit or clear the text and the list comes right back. It used to open a native picker that could leave you unable to delete or reopen it.',
      'The map is easier to handle on a small screen. One finger now scrolls the page (the map used to swallow every touch, leaving nowhere to scroll from); pan the map with two fingers, pinch to zoom, and the caption says so. Once a second finger is down the gesture belongs to the map — a pinch can no longer be stolen mid-zoom and turned into a page scroll. The dots are smaller at the opening county view so dense clusters read as dots instead of a solid mass, and hotspot names hold off until you’re zoomed in about twice as far as before, so they no longer flood the map the moment you start zooming.',
      'The bird-group explainer no longer shows impossible percentages like “1326%”. That number was the group’s species report-rates added together — a sum, not a percentage — so it’s now shown as what it really is: about how many of that group’s species you’d record on one visit (“≈13/visit” for songbirds in a rich month). The explainer text and the group tooltips on hotspot cards use the same honest unit.',
      'The numbers behind the dots are now visible — in the Year planner, which was already the site-by-month table. A new switch above it flips the cell numbers between “Species likely” (as before) and “Reports” — the actual count of eBird checklists the data holds for that site and month. Tap a month name to sort by that month; tap “Hotspot” to restore the usual order. It makes the invisible scale plain: a month’s top spot can rest on 400 reports where another month’s rests on a dozen. The ⓘ beside the map’s caption jumps straight there with Reports showing. Every cell’s tooltip now carries both numbers, and it’s all computed from the loaded data, so it updates itself with every data refresh.',
    ],
  },
  {
    version: 'v30',
    date: '2026-07-17',
    changes: [
      'The filter’s four category buttons have clearer icons: a dove for Type, a ruler for Size, a proper nest for Nest, and binoculars for Behaviour (how easy a bird is to find). Small thing, but the row reads at a glance now.',
    ],
  },
  {
    version: 'v29',
    date: '2026-07-16',
    changes: [
      'Every bird now shows a little silhouette of its group next to it — a heron for waders, a duck for waterfowl, a hawk for raptors, and so on. It leads the facet line in a hotspot’s species list and sits beside each bird in your Target and Seen lists. A quick visual cue for the kind of bird you’re looking at (it’s the group, not the exact species), in both the light and Dawn themes.',
      'In a hotspot’s species list the bird’s name is now the clear headline of its row, with the group icon, facets, frequency and marks reading as the detail beneath it. The “add to your list” control is now a camera — this is a shot list — filled gold when a bird’s on it, a faint outline when it isn’t.',
      'The Ranking screen’s filter is redesigned. It’s always visible now (no more hunting behind “Filter by bird”): four category buttons — Type, Size, Nest, Behaviour — each open to their options, one at a time, with a plain-English reminder that a tap wants a group, a second excludes it, a third clears it. A small row of lights below always shows what you’re filtering by. And the bird icons on each hotspot card are now purely information — this month’s presence, at a glance. Each group reads like a little traffic light: green if it’s around, amber if it might be, red if you shouldn’t expect it — and the colours also step from dark to light, so the state is clear even if you don’t see colour. They’re never a hidden control, so they can’t be confused with the filter.',
      'Photo-first is a real switch again. It used to open a menu and leave you unsure whether anything changed; now one tap flips the ranking and shows it — a filled camera and a bold ON when it’s on, a faint one and OFF when it isn’t. The ⓘ still opens the full how-it-works.',
    ],
  },
  {
    version: 'v28',
    date: '2026-07-16',
    changes: [
      'The bird-type, size, nest and behaviour icons now do something wherever you see them. Before, only the row of type icons on a hotspot card could filter; the same icons on the species matrix, on a species’ page, and beside each bird in your Target and Seen lists were just labels. Now every one of them is a tap-to-filter control: tap an icon to show only birds like that one, tap again to hide them, once more to clear — the same want / exclude / off you already knew from the cards. Touch the “small” icon next to a sparrow and the list narrows to small birds; touch it again and they step aside. A filter you set from anywhere shows the same standing “filtering by…” bar with a one-tap “Show all birds”, so you always know it’s on and can turn it off in a tap.',
      'Tapping to filter is now fast. In a big region — Home is around 760 hotspots — the ranking, the year planner and a hotspot’s species table used to rebuild every single row on each tap, so re-sorting after a filter could hang for seconds. Those lists now show the top of the ranking straight away with a “Show all…” button for the rest, and repeat calculations are cached — so a tap re-sorts right away instead of stalling.',
      'And a few of those icons finally look like the bird they name. The woodpecker was a sideways sparrow stuck on a stick; it’s now a real woodpecker clinging upright to a trunk. The kingfisher is an actual perched kingfisher instead of a hand-drawn blob, the shorebird is a proper long-billed curlew rather than a stand-in, and the ground- and platform-nest marks are clean nest silhouettes. Same meanings, honest drawings — from a public-domain wildlife set.',
      'The icons now tell you what they are. On a hotspot card, every bird group that’s actually around this month shows its name under the icon (the groups that aren’t stay as quiet unlabelled icons, so the row doesn’t get noisy). In your Target and Seen lists each bird’s size and behaviour icons carry their word too. And a hotspot’s species table now prints each bird’s type · size · nest · behaviour as a short line of text instead of icons, so that list stays short. No more guessing which silhouette is which.',
    ],
  },
  {
    version: 'v27',
    date: '2026-07-15',
    changes: [
      'The bottom tab bar is now its own surface. In bright light the floating bar used to blend into the pale cards and the warm background behind it — so it was easy to lose the very control you navigate with. It now sits on a distinct, neutral slate-taupe bar with light icons that stands clear of the warm cream of the rest of the app, with a firmer edge and a clearer shadow — so it always reads as a solid control, in both the light and Dawn themes.',
    ],
  },
  {
    version: 'v26',
    date: '2026-07-15',
    changes: [
      'Frame now tells you how old its data is — and stays useful as it ages. The app runs on eBird histograms that refresh every quarter, but those describe which birds turn up in which months: seasonal patterns that stay reliable for years. So if a refresh is ever missed for a long stretch, Frame doesn’t pretend to be current. Once the data passes about a year and a half old, a calm notice appears at the top of the screen telling you the month it was last updated and reassuring you the seasonal patterns still hold; past three years it honestly calls itself an archive. You can dismiss the notice, and the exact build date always lives in Settings.',
      'If the quarterly refresh ever stops for good, the app winds down gracefully instead of churning forever for no reason. The background heartbeat that keeps the data pipeline awake now steps aside once the data is clearly no longer being maintained — so nothing runs in the background pointlessly, while the app keeps working offline with the last good data it has.',
      'Fixed the Photo-first explainer panel: it used to print a stray “null” line just above the on/off switch, and its weight tables ran hard against the edges of the panel. The stray line is gone and the whole panel now has proper margins.',
    ],
  },
  {
    version: 'v25',
    date: '2026-07-15',
    changes: [
      'Trust badges tell the truth again when you’re filtering. Starring a target bird or turning on an icon filter no longer flips a hotspot’s “Documented / Thin” badge — a well-covered spot stays Documented even when you’re only counting a couple of birds, and the “Skip / Thin” filter no longer points you away from the best places in your area. A hotspot’s coverage is a fact about the hotspot, not about your list.',
      'Dawn Mode is readable everywhere now. The Year planner’s numbers were nearly invisible on the dark cell backgrounds — they now switch to light ink where the cell is dark. Trust badges, the “Delete region” button, and the live badges all had hard-coded colours that failed in one theme or the other; every one is now legible in both.',
      'The maps feel right in the hand. A two-finger drag now pans (it used to be ignored, so the map slid out from under your fingers mid-pinch); a resting palm no longer makes the zoom jump; and a two-finger tap no longer accidentally opens a hotspot. Deep-zoomed maps stay smooth again.',
      'Honest labels and safer edits. “Auto-switch region by location” now asks for permission the moment you turn it on and tells you if it’s blocked, instead of silently doing nothing. Clearing your target list or life list can be undone. The hotspot map says “shootable presence” when photo-first is on, matching the ranking. And importing a life list now handles curly apostrophes (Anna’s Hummingbird) and won’t mistake a place name for a bird.',
      'Offline is sturdier. A flaky network during install can’t wipe your offline copy any more, a version update no longer forces already-downloaded regions to re-download, and the fonts (every number in the app) are cached so nothing falls back to a system font offline.',
    ],
  },
  {
    version: 'v24',
    date: '2026-07-15',
    changes: [
      'Frame is a photographer’s tool first again. Hotspots now rank by SHOOTABLE presence, not raw bird counts: each bird’s real eBird frequency is weighted by how photographable that kind of bird is — in the open ×1, in-and-out ×0.6, skulker ×0.25, and by size from tiny ×0.5 up to large ×1. A marsh full of big, posing egrets now outranks one whose count is padded with hidden wrens. No hidden judgment came back: the weights are two small public tables applied to each bird’s published facet icons, shown in full behind the new camera chip.',
      'The camera chip on the Ranking screen always tells you which ranking you’re looking at — “Photo-first: easiest shots rank higher” or “Every bird counts equally” — and tapping it shows exactly how the weights work, with a one-tap switch between the two. Your choice is remembered on this device. Every displayed number stays the plain truth: frequencies and the “N birds likely” count are never weighted, only the order and the colour intensity.',
      'Every bird’s own page says what photo-first means for it, in one honest line — for example “counts ×0.6 of its frequency (In and out ×0.6 · Large ×1)”. And “Rank hotspots by target presence” keeps the promise it made when it shipped: with it on, your target ranking counts frequency only, and photo-first stands aside until you turn it off.',
      'Under the hood, this release also makes the quarterly eBird data refresh sturdier: the four featured counties (El Dorado, Placer, Sacramento, Humboldt — the ones that keep every hotspot) are rebuilt first so a mid-run failure can’t cost them, and a session cookie pasted as multiple lines no longer breaks the download.',
    ],
  },
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
