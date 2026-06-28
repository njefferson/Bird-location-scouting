# eBird live-overlay proxy

The app's live overlay (recent/notable obs, "nearest recent") calls a
**same-origin** path — `/api/ebird/...` by default — so the eBird API key is
**never** in the client bundle (spec §0/§6) and never in the repo.

The live proxy ships as a Cloudflare Pages Function at
**`frame/functions/api/ebird/[[path]].js`**. Because the deploy uploads the
`frame/` directory, Pages picks that `functions/` folder up automatically — no
extra setup. It injects the key from the `EBIRD_API_TOKEN` secret and only
forwards eBird `v2/...` GETs (so it can't be abused as an open relay).

## What you need to do (once, from your phone)
Add the key as a secret so the deploy can use it without it ever touching the
repo or the browser:

1. Open the repo on github.com → **Settings → Secrets and variables → Actions**.
2. **New repository secret**: name `EBIRD_API_TOKEN`, value = your eBird key.
3. Re-run the **“Deploy Frame”** action (or push any change). The workflow pushes
   that secret to the Cloudflare Pages project and deploys.

That's it — the live badges turn on. Until the secret exists, the overlay simply
stays off and the rest of the app works normally.

## Other hosts
Any serverless function works (Vercel/Netlify/Worker/local Express). It must:
accept `GET /api/ebird/<eBird v2 path>?<query>`, add header
`x-ebirdapitoken: <key>`, forward to `https://api.ebird.org/<path>?<query>`, and
return the JSON. Point the app at it in **Settings → Proxy base URL** if it
isn't `/api/ebird`.
