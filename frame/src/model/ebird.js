// =============================================================================
// LIVE OVERLAY (Layer C, §2C) — eBird API 2.0, runtime, optional
// =============================================================================
// IMPORTANT (§0): the eBird API does NOT serve frequency. It serves *recent*
// observations. We use it only to BADGE hotspots ("seen in last N days", "hot
// right now") and to answer "nearest recent place to see species X". The static
// score never depends on it, so the whole app works offline with this disabled.
//
// KEY HANDLING (§0, §6): never ship the eBird API key in client code. This
// client calls a same-origin proxy by default (e.g. a Cloudflare Worker / Pages
// Function at /api/ebird that injects the x-ebirdapitoken header). If you have
// confirmed the API returns CORS headers for browser fetches you may point
// `proxyBase` straight at https://api.ebird.org and supply a key — but only in
// a local/dev context, never in a shipped bundle.
//
// All calls degrade gracefully: any failure (offline, no proxy, rate limit)
// resolves to null/empty and the UI simply hides the live badges.
// =============================================================================

import { boxCenter, BOX } from '../data/hotspots.js';

const DEFAULT_PROXY = '/api/ebird'; // your serverless proxy mounts the eBird API here

function cfg() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('frame.ebird') || '{}'); } catch {}
  return {
    proxyBase: saved.proxyBase || DEFAULT_PROXY,
    enabled: saved.enabled ?? true,
    // Optional: a key here is only used for direct dev calls, never shipped.
    apiKey: saved.apiKey || '',
  };
}

export function ebirdSettings() { return cfg(); }
export function saveEbirdSettings(patch) {
  const next = { ...cfg(), ...patch };
  localStorage.setItem('frame.ebird', JSON.stringify(next));
  return next;
}

async function call(path, params = {}) {
  const c = cfg();
  if (!c.enabled) return null;
  const url = new URL(c.proxyBase.replace(/\/$/, '') + path, location.origin);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  try {
    const headers = c.apiKey ? { 'x-ebirdapitoken': c.apiKey } : {};
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // offline / CORS / proxy down → graceful no-op
  }
}

/**
 * Recent observations across the whole box. Returns a map of
 * speciesCode → newest obsDt, or null if the overlay is unavailable.
 */
export async function recentInBox({ back = 14, lat, lng, dist = 30 } = {}) {
  // Default to the Sacramento box center; the app passes the active region's
  // center when it isn't Home, so the "seen recently" badges follow the region.
  if (lat == null || lng == null) ({ lat, lng } = boxCenter());
  const obs = await call('/v2/data/obs/geo/recent', { lat: (+lat).toFixed(3), lng: (+lng).toFixed(3), dist, back });
  if (!Array.isArray(obs)) return null;
  const bySpecies = {};
  for (const o of obs) {
    if (!o.speciesCode || !o.obsDt) continue;
    if (!bySpecies[o.speciesCode] || o.obsDt > bySpecies[o.speciesCode]) bySpecies[o.speciesCode] = o.obsDt;
  }
  return bySpecies;
}

/** Nearest recent place to photograph species X (§2C). */
export async function nearestForSpecies(speciesCode, { back = 30 } = {}) {
  const { lat, lng } = boxCenter();
  const obs = await call(`/v2/data/nearest/geo/recent/${speciesCode}`, { lat: lat.toFixed(3), lng: lng.toFixed(3), back });
  return Array.isArray(obs) ? obs : null;
}

/** Quick connectivity probe for the Settings screen. */
export async function probe() {
  const r = await recentInBox({ back: 1 });
  return r != null;
}

export { BOX };
