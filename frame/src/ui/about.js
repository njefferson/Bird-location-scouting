// =============================================================================
// About — an unobtrusive floating "ⓘ" button + modal that explains what the
// app does and the reasoning behind its ranking. Mounted once at boot, it sits
// in the top-right corner on every screen (small, low-opacity, never in the
// way) and opens a native <dialog> with Esc / backdrop-click to close.
// =============================================================================
import { el } from './dom.js';
import { CHANGELOG } from '../data/changelog.js';
import { ROADMAP } from '../data/roadmap.js';

const ABOUT_HTML = `
  <h2>Frame — why this app exists</h2>
  <p>Most birding tools rank places by <em>rarity</em> — what a lister chases.
  Frame ranks them by <strong>photographic opportunity</strong>: where you can
  actually point a lens and come home with a usable frame of a bird, this month,
  in your region — from the Sacramento foothills to the Humboldt coast, or any
  set of counties you save from the map.</p>

  <h3>How the ranking works</h3>
  <p class="about-formula">opportunity = Σ&nbsp;(frequency × how shootable the bird is)</p>
  <p>By default Frame ranks hotspots by <strong>photographic opportunity</strong>:
  how much of what you're after is actually there this month (from eBird checklist
  frequencies), weighted by how shootable each kind of bird is — a bird in the open
  counts more than a skulker, a larger bird more than a tiny one. Those weights come
  only from each bird's published facet icons; tap the camera chip on the Ranking
  screen for the full tables, or switch photo-first off to rank by plain presence.
  The headline number on each card is how many species clear 5% of checklists — the
  birds you'd likely run into — and that count is a plain fact, never weighted.</p>

  <h3>The bird icons</h3>
  <p>Each spot shows a row of <strong>bird-group icons</strong> — waders,
  raptors, songbirds, waterfowl and so on. An icon is bright when that group is
  really present this month, subdued when it's scarce, faint when it's absent. A
  <span class="about-inferred">dashed</span> icon means the numbers are still the
  habitat/season model, not real eBird data.</p>
  <p>Tap an icon to <strong>filter</strong>: once to want that group, again to
  exclude it, once more to clear. Filter by size (tiny songbird up to condor
  scale), nest style, or behaviour too — all of them are honest facts about the
  bird, a <em>likelihood</em> of a shot, never a promise.</p>

  <h3>What you can do</h3>
  <ul>
    <li><strong>Ranking</strong> — this month's best hotspots, each with its bird
    icons, top species and a live "seen recently" badge.</li>
    <li><strong>Planner</strong> — a hotspot × month heatmap to plan the year.</li>
    <li><strong>Species</strong> — search a bird for its best hotspot and month.</li>
    <li><strong>Filters</strong> — the bird icons, plus Shoot Now, Underrated,
    Be the Documenter, Skip-Thin.</li>
    <li>Installable to your home screen; works offline.</li>
  </ul>

  <h3>An honesty rule</h3>
  <p>Where real eBird histogram data exists, frequencies are
  <strong>Documented</strong>. Where it doesn't, they come from a transparent
  habitat-and-season model and are clearly flagged
  <span class="about-inferred">inferred&nbsp;*</span> — never dressed up as real.
  Nothing here is a fabricated number.</p>

  <p class="about-foot">Built for a Nikon Z50 II + 50–250mm shooter near
  Sacramento, CA · Frequency data: eBird (refresh quarterly) · Map landmarks:
  Natural Earth (public domain); lake shorelines © OpenStreetMap contributors
  (ODbL); curated reservoir &amp; refuge labels, each position verified against
  its county — orientation, not navigation · Bird-group icons from
  game-icons.net (CC BY 3.0) by Lorc, Delapouite, Caro Asercion &amp; sbed, and
  the public-domain QGISsvgAnimals set (woodpecker, kingfisher, curlew).</p>
`;

// "Coming next" — planned features from the roadmap data module. Items move
// from here into "What's new" as they ship (edit data/roadmap.js each release).
function roadmapHTML() {
  if (!ROADMAP.length) return '';
  const items = ROADMAP.map((r) =>
    `<li><strong>${r.title}</strong> — ${r.detail}</li>`).join('');
  return `<h3 class="whatsnew-h">Coming next</h3><ul class="roadmap">${items}</ul>`;
}

// "What's new" — latest few releases from the changelog data module (single
// source of truth). Full history lives in /CHANGELOG.md and GitHub Releases.
const WHATSNEW_LIMIT = 5;
function changelogHTML() {
  const releases = CHANGELOG.slice(0, WHATSNEW_LIMIT).map((r) => `
    <div class="rel">
      <p class="rel-head"><span class="rel-ver">${r.version}</span>
      <span class="rel-date">${r.date}</span></p>
      <ul>${r.changes.map((c) => `<li>${c}</li>`).join('')}</ul>
    </div>`).join('');
  const more = CHANGELOG.length > WHATSNEW_LIMIT
    ? `<p class="rel-more"><a href="https://github.com/njefferson/Bird-location-scouting/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Full changelog ↗</a></p>`
    : '';
  return `<h3 class="whatsnew-h">What’s new</h3>${releases}${more}`;
}

export function mountAbout() {
  if (document.getElementById('about-btn')) return; // mount once

  const dialog = el('dialog.about-dialog', { id: 'about-dialog' }, [
    el('button.about-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
    el('div.about-body', { html: ABOUT_HTML + roadmapHTML() + changelogHTML() }),
  ]);
  // Click on the backdrop (outside the content) closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  const btn = el('button.about-btn', {
    id: 'about-btn',
    title: 'About this app',
    'aria-label': 'About this app',
    onclick: () => dialog.showModal(),
  }, 'ⓘ');

  document.body.append(btn, dialog);
}
