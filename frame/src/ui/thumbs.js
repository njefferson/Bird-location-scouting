// =============================================================================
// SPECIES THUMBNAILS — a small real photo beside each bird's name
// =============================================================================
// The photos live in data/thumbs/<eBird-code>.webp and are built by
// scripts/build-thumbnails.mjs from WIKIMEDIA COMMONS (freely-licensed only —
// never eBird/Macaulay, which is copyrighted). data/thumbs.json is the manifest:
// code -> { n: name, a: artist, l: license, s: Commons file page }. It also
// drives the photo credits in About.
//
// speciesThumb(s) returns a leading avatar: the photo when we have one for the
// species' code, otherwise the dim guild silhouette (so a missing photo is a
// graceful fallback, never a blank). The avatar is decorative — the visible
// species name is the label — so it is aria-hidden with an empty alt, and a
// screen reader reads only the name.
// =============================================================================
import { el } from './dom.js';
import { GUILDS, facetSvg } from '../data/facets.js';

let THUMBS = null;      // code -> credit record, or {} once loaded with none
let _loading = null;

/** Load the manifest once (call at boot, before the first render). */
export function loadThumbs() {
  if (THUMBS) return Promise.resolve(THUMBS);
  if (_loading) return _loading;
  _loading = fetch('./data/thumbs.json', { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : {}))
    .catch(() => ({}))
    .then((map) => { THUMBS = map || {}; return THUMBS; });
  return _loading;
}

/** The whole manifest (code -> credit), for the About credits list. {} until loaded. */
export function thumbCredits() { return THUMBS || {}; }

/** Do we have a photo for this species' code? */
export function hasThumb(code) { return !!(THUMBS && code && THUMBS[code]); }

function guildGlyph(s, px) {
  const g = s && GUILDS[s.guild];
  return el('span.sp-thumb-glyph', { 'aria-hidden': 'true', html: facetSvg(g ? g.icon : '', Math.round(px * 0.72)) });
}

/**
 * Leading avatar for a species — photo when available, guild silhouette when not.
 * @param s      species object (uses s.code, s.guild)
 * @param size   box size in px (default 30)
 * @param onOpen optional click handler — when given, the photo becomes a tap
 *               target (pointer only) that opens the species, mirroring the
 *               species-name link. Kept aria-hidden / off the tab order: it's a
 *               decorative duplicate of an accessible name link (or the Species
 *               search), so it adds a touch shortcut without keyboard clutter.
 */
export function speciesThumb(s, size = 30, onOpen = null) {
  const box = el('span.sp-thumb', { 'aria-hidden': 'true', style: `--thumb:${size}px` });
  if (s && s.code && THUMBS && THUMBS[s.code]) {
    const img = el('img.sp-thumb-img', {
      src: `./data/thumbs/${s.code}.webp`, alt: '', loading: 'lazy', decoding: 'async',
      width: String(size), height: String(size),
    });
    // If the file is somehow missing (offline before first visit), fall back.
    img.addEventListener('error', () => { box.classList.add('is-fallback'); box.replaceChildren(guildGlyph(s, size)); });
    box.append(img);
  } else {
    box.classList.add('is-fallback');
    box.append(guildGlyph(s, size));
  }
  if (onOpen) {
    box.classList.add('clickable');
    box.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); onOpen(); });
  }
  return box;
}
