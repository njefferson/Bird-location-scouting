// Cloudflare Pages Function — same-origin eBird proxy (LIVE for the deployed app).
// Mounts at /api/ebird/* . Injects the key from the EBIRD_API_TOKEN secret so it
// never reaches the browser and is never in the repo.
//
// Locked down so the public URL can't be used as a free relay for your key:
//   1. ENDPOINT ALLOWLIST — only the two read-only endpoints the app actually
//      calls are forwarded. Everything else (the rest of eBird's v2 API, and any
//      `..` path-traversal attempt) is refused. The URL host is always
//      api.ebird.org, so this can never reach another host.
//   2. SAME-SITE GUARD — a request that carries an Origin/Referer from ANOTHER
//      site is refused. This is a SOFT guard (a non-browser client can send no
//      headers, or forge them) and is deliberately permissive when neither
//      header is present, so it never breaks a privacy setup that strips
//      Referer. For a hard limit, add a Rate Limiting / WAF rule to the Pages
//      project in the Cloudflare dashboard — that's the real backstop and can't
//      live in this file.
const ALLOWED = [
  /^v2\/data\/obs\/geo\/recent$/,                 // recentInBox — "seen recently" badges
  /^v2\/data\/nearest\/geo\/recent\/[A-Za-z0-9]+$/, // nearestForSpecies — species "last reported at"
];

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const token = env.EBIRD_API_TOKEN;
  if (!token) {
    // No secret configured yet → the app's overlay degrades gracefully.
    return json({ error: 'overlay-not-configured' }, 503);
  }

  // Same-site guard: reject only on positive cross-origin evidence, so a legit
  // same-origin fetch (Referer present) and a no-referrer client both pass, but
  // another website calling this proxy does not.
  const self = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  let from = origin || null;
  if (!from && referer) { try { from = new URL(referer).origin; } catch { from = null; } }
  if (from && from !== self) return json({ error: 'forbidden-origin' }, 403);

  // Normalize the sub-path THROUGH a URL so `..` traversal is collapsed before
  // the allowlist check, then confirm it's one of the two permitted endpoints.
  const raw = (Array.isArray(params.path) ? params.path.join('/') : (params.path || '')).replace(/^\/+/, '');
  const sub = new URL(`https://api.ebird.org/${raw}`).pathname.replace(/^\/+/, '');
  if (!ALLOWED.some((re) => re.test(sub))) return json({ error: 'forbidden-path' }, 403);

  const inUrl = new URL(request.url);
  const target = new URL(`https://api.ebird.org/${sub}`);
  target.search = inUrl.search;

  let res;
  try {
    res = await fetch(target.toString(), { headers: { 'x-ebirdapitoken': token } });
  } catch {
    return json(null, 502);
  }
  // Same-origin response — no CORS headers needed. Only cache SUCCESSES; caching
  // an upstream error for 5 minutes would strand the overlay after a blip.
  const headers = { 'Content-Type': 'application/json' };
  if (res.ok) headers['Cache-Control'] = 'public, max-age=300';
  return new Response(res.body, { status: res.status, headers });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
