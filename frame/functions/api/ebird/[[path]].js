// Cloudflare Pages Function — same-origin eBird proxy (LIVE for the deployed app).
// Mounts at /api/ebird/* . Injects the key from the EBIRD_API_TOKEN secret so it
// never reaches the browser and is never in the repo. Read-only GET pass-through,
// restricted to eBird's v2 API so the deployed proxy can't be abused as an
// open relay with your key.
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const token = env.EBIRD_API_TOKEN;
  if (!token) {
    // No secret configured yet → the app's overlay degrades gracefully.
    return json({ error: 'overlay-not-configured' }, 503);
  }

  const sub = (Array.isArray(params.path) ? params.path.join('/') : (params.path || '')).replace(/^\/+/, '');
  if (!sub.startsWith('v2/')) return json({ error: 'forbidden-path' }, 403);

  const inUrl = new URL(request.url);
  const target = new URL(`https://api.ebird.org/${sub}`);
  target.search = inUrl.search;

  let res;
  try {
    res = await fetch(target.toString(), { headers: { 'x-ebirdapitoken': token } });
  } catch {
    return json(null, 502);
  }
  // Same-origin response — no CORS headers needed; cache briefly (overlay only).
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
