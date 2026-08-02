# Deployment

This is a **Next.js static export** (`output: "export"`). `npm run build` produces
a self-contained static site in `out/` — the exact same output regardless of where
it is hosted. Two supported targets:

| Target | Server needed | When to use |
|---|---|---|
| **Self-hosted (Docker + nginx)** — Coolify, Dokku, a VPS, Render, Fly… | Yes | Full control, own domain/disk, no platform limits. **Default.** |
| **GitHub Pages** | No | Zero-infra fallback — publish straight from CI with no server. |

You pick one with a single switch (below); the build and `out/` are identical.

> ⚠️ **The two targets are not SEO-equivalent.** Legacy URLs from the archive's
> earlier address schemes are served as 301 redirects by nginx (see
> [Legacy URL redirects](#legacy-url-redirects)). GitHub Pages cannot issue
> redirects for a static site, so in Pages mode every previously indexed URL
> 404s again — which is what removed this site from the search index in the
> first place. Treat Pages mode as a short-term fallback only.

---

## The switch: `USE_GITHUB_PAGES`

A GitHub Actions **repository variable** selects the target
(Settings → Secrets and variables → Actions → **Variables**):

| `USE_GITHUB_PAGES` | Result |
|---|---|
| unset / `false` (default) | GitHub Pages workflow is a **no-op**; a Docker/nginx host is the publisher. |
| `true` | `deploy-pages.yml` builds and publishes to **GitHub Pages** — no server required. |

Both jobs in `.github/workflows/deploy-pages.yml` are gated on this variable, so
flipping it is the only thing you change to move between hosts. The
`update-message-data.yml` data-refresh workflow is unaffected — it runs the same
in both modes.

---

## Option A — Self-hosted (Docker + nginx)

Files: [`Dockerfile`](Dockerfile) (multi-stage build → nginx), [`nginx.conf`](nginx.conf)
(static routing, caching, gzip, security headers), [`.dockerignore`](.dockerignore).
These are host-agnostic — anything that builds a Dockerfile and exposes a port can
run them. Coolify is the reference setup below.

1. **Keep `USE_GITHUB_PAGES` unset** (or `false`).
2. In your platform, create an app from this Git repo, branch `main`.
   - Build pack: **Dockerfile** · Exposed port: **80**.
   - Domain: `https://message.cengizyilmaz.net` · enable HTTPS (Coolify/Traefik
     issues a Let's Encrypt certificate automatically).
   - Enable **automatic deploys** (webhook on push to `main`).
3. Point the domain's **DNS A record** at the host's IP.
4. Deploy. The container builds (`npm ci && npm run build`) and nginx serves `out/`.

> Only if you serve a **different** domain: set a build argument
> `SITE_URL=https://your-domain` and update `siteConfig.url` in
> [`config/site.ts`](config/site.ts).

## Option B — GitHub Pages (no server)

1. Set repository variable **`USE_GITHUB_PAGES = true`**.
2. Settings → **Pages** → Source → **GitHub Actions**.
3. Point the domain's **DNS** at GitHub Pages (the committed
   [`public/CNAME`](public/CNAME) carries the custom domain into `out/`).
4. Push to `main` (or run `deploy-pages` manually / wait for the twice-daily
   schedule). CI builds and publishes; no server is involved.

> Note: hourly data commits from `update-message-data.yml` are pushed with the
> default `GITHUB_TOKEN`, which does not re-trigger `on: push` workflows, so in
> Pages mode fresh data publishes on the workflow's `schedule` (twice daily) or a
> manual run.

---

## Legacy URL redirects

The detail-page address has changed twice over the archive's life:

| Scheme | Example | Status |
|---|---|---|
| Title-only slug, trailing slash | `/message/update-to-ews-access-for-kiosk-licenses/` | redirected |
| Bare record id | `/message/mc1191578` | redirected |
| Id-prefixed slug (current) | `/message/mc1191578-update-to-ews-access-for-kiosk-licenses` | canonical |

Because the slug embeds the title, an upstream title edit also moves a record's
canonical URL, orphaning the address that was previously indexed. A static export
has nothing to catch any of this, so those URLs simply returned 404 — search
engines drop 404s and discard the ranking signals attached to them.

`scripts/build-redirects.mjs` runs in `prebuild` and replays every id, every
current title and every title in `@data/history` into
`.generated/legacy-redirects.map`. The Dockerfile copies it to
`/etc/nginx/legacy-redirects.map`; [`nginx.conf`](nginx.conf) `include`s it into a
`map` and 301s each key to the record's current canonical path in a single hop.
Segments that are live canonical URLs are excluded by the generator, so the map
can never redirect a page onto itself.

The runtime stage runs `nginx -t`, so a malformed config or a missing map fails
the **build** rather than the deploy.

To validate locally without a full deploy:

```bash
npm run build:redirects
docker build -t mc-archive .        # `nginx -t` runs inside the build
```

---

## Data pipeline (same for both targets)

`update-message-data.yml` (GitHub Actions) refreshes Microsoft Graph + Roadmap
data hourly and commits `@data`. In self-hosted mode the push triggers a rebuild
via the host's webhook; in Pages mode it publishes on schedule. Nothing about the
data flow changes between targets.

---

## Post-deploy verification

```
/                          → home + table renders
/archive · /roadmap        → tables
/message/mc<id>-<slug>     → a real message detail page
/roadmap/rm<id>-<slug>     → a real roadmap detail page
/message/mc<id>/compare?from=<a>&to=<b>  → version comparison (client-rendered)
/robots.txt · /rss.xml     → 200
/sitemap.xml               → 200, a <sitemapindex> listing four segments
/sitemaps/messages.xml · /sitemaps/roadmap.xml
/sitemaps/pages.xml · /sitemaps/services.xml  → 200
/search-index.json · /history/MC<id>.json → 200 (search + compare data)
/service/microsoft-teams   → hub, page 1, links to pages 2..N
/service/microsoft-teams/9 → last page, 200, self-canonical
/service/microsoft-teams/1 → 301 to /service/microsoft-teams
/this-does-not-exist       → custom 404
```

Redirects — each must be a **single** 301 to the canonical URL, not a chain:

```bash
BASE=https://message.cengizyilmaz.net
for u in "/message/mc1191578" \
         "/message/update-to-ews-access-for-kiosk-frontline-worker-licenses/" \
         "/message/mc1191578-update-to-ews-access-for-kiosk-frontline-worker-licenses/" \
         "/about.html" "/index.html"; do
  printf '%s -> ' "$u"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$BASE$u"
done
```

And confirm the canonical URL itself still returns **200**, not a redirect —
a loop here would take the whole archive offline for crawlers:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "$BASE/message/mc1191578-update-to-ews-access-for-kiosk-frontline-worker-licenses"
```

Also confirm the Ctrl/Cmd-K search and a compare page load — they rely on
`/search-index.json`, `/message-paths.json` and `/history/*.json` being served.

## Optional hardening (self-hosted)

- **HSTS** at the Traefik/proxy layer once HTTPS is stable.
- **CSP** (needs hashes/nonces for the GA + JSON-LD inline scripts — add and test
  deliberately).
- **Brotli** — stock `nginx:alpine` ships gzip only; swap the image if you want it.

## Rollback (self-hosted)

Platforms like Coolify keep previous deployments — redeploy a known-good build to
roll back instantly. Because the image is immutable static output, rollbacks are
safe and instant.
