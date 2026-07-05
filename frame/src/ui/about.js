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

  <h3>How the score works</h3>
  <p class="about-formula">HotspotScore = Σ&nbsp;frequency × photoability</p>
  <p>For each species, two things must both be true — so we
  <strong>multiply</strong>, never add:</p>
  <ul>
    <li><strong>Frequency</strong> — how often it's actually reported here this
    month (from eBird checklists).</li>
    <li><strong>Photoability</strong> — how shootable it is: size,
    approachability, whether it perches in the open.</li>
  </ul>
  <p>A common bird you can't get near and a stunning bird that's never here both
  score low. The score rewards birds that are present <em>and</em> shootable.</p>

  <h3>What you can do</h3>
  <ul>
    <li><strong>Ranking</strong> — this month's best hotspots, each with its top
    photographable species and a live "seen recently" badge.</li>
    <li><strong>Planner</strong> — a hotspot × month heatmap to plan the year.</li>
    <li><strong>Species</strong> — search a bird for its best hotspot and month.</li>
    <li><strong>Filters</strong> — Shoot Now, Underrated, Be the Documenter,
    Skip-Thin.</li>
    <li>Installable to your home screen; works offline.</li>
  </ul>

  <h3>An honesty rule</h3>
  <p>Where real eBird histogram data exists, frequencies are
  <strong>Documented</strong>. Where it doesn't, they come from a transparent
  habitat-and-season model and are clearly flagged
  <span class="about-inferred">inferred&nbsp;*</span> — never dressed up as real.
  Nothing here is a fabricated number.</p>

  <p class="about-foot">Built for a Nikon Z50 II + 50–250mm shooter near
  Sacramento, CA · Frequency data: eBird (refresh quarterly).</p>
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
