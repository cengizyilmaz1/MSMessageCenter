# Microsoft 365 Message Center Archive

Static, searchable Microsoft 365 Message Center and Microsoft 365 Roadmap archive for `message.cengizyilmaz.net`.

This project uses Next.js static export and is served by Coolify (Docker + nginx). It imports Microsoft 365 Message Center data through Microsoft Graph, imports Microsoft 365 Roadmap items from the public roadmap feed, generates machine-readable JSON/RSS/SEO files, and publishes a fully static archive.

## Production Targets

- Site: `https://message.cengizyilmaz.net`
- Parent site: `https://cengizyilmaz.net`
- Hosting: self-managed Docker + nginx (e.g. Coolify) or GitHub Pages via a switch. See [DEPLOYMENT.md](DEPLOYMENT.md).
- Output directory: `out/` (Next.js static export, served by nginx)
- Canonical Message Center route: `/message/mc{id}-{title-slug}`
- Canonical Roadmap route: `/roadmap/rm{id}-{title-slug}`

## Core Capabilities

- Searchable archive for Microsoft 365 Message Center announcements.
- Separate Microsoft 365 Roadmap archive and detail routes.
- Deterministic canonical URLs for Message Center and Roadmap records.
- Service archive pages, paginated above 150 records
  (`/service/{slug}` + `/service/{slug}/{page}`). These are the crawl path to
  every detail page, so the union of a service's pages always contains its full
  record set as real anchors — see [`lib/pagination.mjs`](lib/pagination.mjs).
- Message version history and comparison pages (the compare route reads the version pair from `?from=` and `?to=` query parameters client-side).
- RSS feed, segmented sitemap index, robots.txt, llms.txt, and AI-friendly JSON index.
- Permanent redirects from every URL scheme the archive has ever published, so
  existing citations and search-engine listings keep resolving. See
  [Legacy URL redirects](DEPLOYMENT.md#legacy-url-redirects).
- Static export compatible with GitHub Pages (without the redirects — see
  [DEPLOYMENT.md](DEPLOYMENT.md)).

## Architecture Overview

```mermaid
flowchart LR
  subgraph Sources["Sources"]
    Graph["Microsoft Graph<br/>Service Announcements"]
    RoadmapFeed["Microsoft 365 Roadmap RSS"]
  end

  subgraph GitHub["GitHub repository"]
    UpdateScript["@build/Update-MessageCenter.ps1<br/>(GitHub Actions, hourly)"]
    DataStore["@data/*.json<br/>messages · roadmap · archive/ · history/"]
    Code["app/ · components/ · lib/ · scripts/"]
  end

  subgraph Coolify["Coolify — Docker build (npm run build)"]
    FeedBuilder["prebuild: build-public-feeds + build-references<br/>→ messages-index.json · search-index.json<br/>· message-paths.json · public/history · rss.xml<br/>· sitemap.xml + sitemaps/*.xml"]
    RedirectBuilder["prebuild: build-redirects<br/>→ .generated/legacy-redirects.map"]
    NextBuild["next build → out/**<br/>HTML · robots.txt (metadata route)"]
    Nginx["nginx serves out/<br/>+ 301s legacy URLs from the map"]
  end

  Consumer["Visitors · crawlers · AI (llms.txt)"]

  Graph --> UpdateScript
  RoadmapFeed --> UpdateScript
  UpdateScript --> DataStore
  DataStore --> FeedBuilder
  DataStore --> RedirectBuilder
  DataStore --> NextBuild
  Code --> NextBuild
  FeedBuilder --> NextBuild
  NextBuild --> Nginx
  RedirectBuilder --> Nginx
  GitHub -->|"push webhook"| Coolify
  Nginx --> Consumer
```

## Data Pipeline

```mermaid
sequenceDiagram
  participant Actions as GitHub Actions
  participant Script as Update-MessageCenter.ps1
  participant Graph as Microsoft Graph
  participant Roadmap as Roadmap RSS
  participant Repo as GitHub repo (@data)
  participant Coolify as Coolify (Docker + nginx)

  Actions->>Script: Hourly schedule / manual dispatch
  Script->>Graph: Fetch Message Center announcements
  Script->>Roadmap: Fetch Roadmap feed
  Script->>Repo: Commit refreshed @data (messages, roadmap, archive, history)
  Repo-->>Coolify: Push webhook
  Coolify->>Coolify: docker build → npm run build (prebuild feeds + next export → out/)
  Coolify->>Coolify: nginx publishes the new static site
```

## Canonical Routing Model

```mermaid
flowchart TD
  Record["Archive record"] --> Source{"Source"}
  Source -->|"Message Center"| MC["/message/mc{id}-{title-slug}"]
  Source -->|"Roadmap"| RM["/roadmap/rm{id}-{title-slug}"]

  MC --> MCMeta["Canonical, Open Graph, Twitter card, JSON-LD"]
  RM --> RMMeta["Canonical, Open Graph, Twitter card, JSON-LD"]

  MC --> McFeeds["sitemap.xml<br/>rss.xml<br/>messages-index.json"]
  RM --> RmFeeds["sitemap.xml<br/>rss.xml<br/>messages-index.json"]
```

Message Center and Roadmap routes must not be mixed. Roadmap records are never generated under `/message/`, and Message Center records are never generated under `/roadmap/`.

### Service pagination

`/service/{slug}` is page 1; pages 2..N live at `/service/{slug}/{page}`. Records
are spread **evenly** across pages rather than filling each to the 150 cap, so a
155-record service becomes 78 + 77 instead of 150 + 5 — a five-record page is
thin content, not a page. Each page is self-canonical and indexable, and links to
every other page so none is more than one hop from the hub.

Two rules keep this consistent, and both are worth knowing before changing
`SERVICE_PAGE_SIZE`:

- `scripts/build-public-feeds.mjs` derives sitemap pagination URLs from the same
  record set `lib/listing.ts` `getServiceListing()` builds from
  (`messages.json` + `roadmap.json` + `messages-archive.json`), not from the
  per-record archive files. A different source there would put URLs in the
  sitemap that the build never generates.
- Page 1 is never emitted as `/1`; nginx 301s that URL to the hub.

## Deployment Flow

```mermaid
flowchart LR
  Push["Push to main<br/>(code changes)"] --> Webhook["Coolify webhook"]
  Schedule["Hourly schedule<br/>update-message-data.yml"] --> Commit["Fetch Graph + Roadmap<br/>commit refreshed @data"]
  Commit --> Webhook
  Webhook --> Build["Coolify: Docker build<br/>npm ci · npm run build"]
  Build --> Serve["nginx + Traefik (Let's Encrypt HTTPS)"]
  Serve --> Site["https://message.cengizyilmaz.net"]
```

> The default host is a self-managed Docker + nginx server (e.g. Coolify); set
> the `USE_GITHUB_PAGES` repository variable to `true` to serve from GitHub Pages
> instead (no server). See [DEPLOYMENT.md](DEPLOYMENT.md). The data-refresh
> workflow (`update-message-data.yml`) runs the same either way, committing
> `@data`; a push then triggers a rebuild.

## Project Structure

```text
.
├── .github/workflows/        # Data update and GitHub Pages deployment
├── @build/                   # Microsoft Graph and Roadmap update scripts
├── @data/                    # Source and generated archive data
│   ├── archive/              # Per-message archived JSON snapshots
│   └── history/              # Version history per message
├── app/                      # Next.js App Router static routes
├── components/               # Layout, table, message, SEO, UI components
├── config/                   # Site-level configuration
├── lib/                      # Data access, filtering, SEO, slug utilities
├── public/                   # Public machine-readable files and OG assets
├── scripts/                  # Feed, reference, history, and redirect generators
├── styles/                   # Global CSS and design tokens
└── types/                    # Shared TypeScript types
```

## Technology Stack

- Next.js 16 App Router with static export.
- React 19 and TypeScript 6. TypeScript 7 is held back because
  `typescript-eslint` v8 — pulled in by `eslint-config-next` — declares
  `typescript <6.1.0`; ESLint 10 is held back for the same reason, since
  `eslint-plugin-react` still peers on ESLint 9.
- Tailwind CSS v4 with local design tokens. Tailwind v4 prefixes via Lightning
  CSS, so autoprefixer is deliberately absent from the PostCSS chain.
- TanStack Table for large archive browsing.
- GitHub Actions for scheduled data updates (commits to `@data` trigger a Coolify rebuild).
- Microsoft Graph PowerShell SDK for Message Center ingestion.

## Public Files

The exported site includes these public machine-readable files:

- `/messages-index.json` - compact canonical index for active, roadmap, and archived records (AI/machine consumers).
- `/search-index.json` - slim client-side search index (id, title, url, source, services only).
- `/messages-archive.json` - archive-only table index.
- `/rss.xml` - latest Message Center and Roadmap feed.
- `/sitemap.xml` - sitemap index. Segments live under `/sitemaps/`:
  `pages.xml`, `services.xml`, `messages.xml`, `roadmap.xml`. Submitting them
  separately in Search Console gives a per-section indexed count instead of one
  opaque total.
- `/robots.txt` - crawler policy and sitemap reference.
- `/llms.txt` - AI/search consumer guidance.
- `/CNAME` - legacy GitHub Pages custom-domain marker (retained for the manual `deploy-pages` backup; Coolify/nginx does not use it).

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run static validation:

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:build   # checks the export in out/
```

`verify:build` ([scripts/verify-build.mjs](scripts/verify-build.mjs)) is the gate
that lint, typecheck and `next build` cannot be: it compares the URLs the site
*advertises* against the files it actually produced. It asserts that every
sitemap URL has a page, every page is self-canonical, every detail page is
linked from a service page rather than sitemap-only, version and compare pages
are `noindex` and absent from the sitemaps, pagination is contiguous and fully
cross-linked, and every legacy redirect reaches a real page in a single hop
without shadowing a live URL. It runs in the Docker build and in the GitHub
Pages workflow, so a broken export fails the deploy rather than reaching
production.

`npm run build` refreshes public feed files and the legacy-URL redirect map first, then runs `next build` (Next.js 16 builds with Turbopack by default). Because `next.config.mjs` uses `output: "export"`, production files are written to `out/`.

The `prebuild` hook runs three generators:

| Script | Output |
|---|---|
| `scripts/build-public-feeds.mjs` | `public/history/*`, `message-paths.json`, `messages-index.json`, `search-index.json`, `table-index.json`, `rss.xml`, `sitemap.xml` + `sitemaps/*.xml` |
| `scripts/build-references.mjs` | augments `messages-index.json` with cross-message references |
| `scripts/build-redirects.mjs` | `.generated/legacy-redirects.map` (nginx 301 map for legacy URLs) |

## Data Updates

For GitHub Actions, create these repository secrets:

- `TENANT_ID`
- `CLIENT_ID`
- `GRAPH_SECRET`

For local data updates, set environment variables or create `@build/config-m365.json` from `@build/config-m365.example.json`. Keep the real config file local and ignored.

```powershell
./@build/Update-MessageCenter.ps1 -GraphSecret "<client-secret>"
```

To refresh only Microsoft 365 Roadmap data:

```powershell
./@build/Update-MessageCenter.ps1 -RoadmapOnly
```

## Security and Data Handling

- Do not commit tenant IDs, client secrets, tokens, `.env` files, or local Graph configuration.
- Keep `@build/config-m365.json` and local secret files out of version control.
- Treat Message Center content as tenant-specific. Always verify tenant applicability in the Microsoft 365 admin center.
- The site is static; no backend runtime or server-side secret access is required.

## Deployment

The same static `out/` can be served two ways, selected by the
`USE_GITHUB_PAGES` repository variable. See [DEPLOYMENT.md](DEPLOYMENT.md) for the
full runbook.

- **Self-managed Docker + nginx (default, e.g. Coolify)** — the host builds
  (`npm ci && npm run build`) and serves `out/`; a push to `main` (or a data
  commit from `update-message-data`) triggers a rebuild via webhook.
- **GitHub Pages (no server)** — set `USE_GITHUB_PAGES=true` and Pages Source =
  GitHub Actions; `deploy-pages.yml` then builds and publishes on push/schedule.

Point `message.cengizyilmaz.net` DNS at the chosen host, and submit
`https://message.cengizyilmaz.net/sitemap.xml` in Google Search Console.

## Files Not Intended for Copy or Commit

Do not copy or commit local/generated working directories and private files:

- `node_modules/`
- `.next/`
- `out/`
- `.env*`
- local logs
- local task notes
- `@build/config-m365.json`
- `@build/secrets-m365.json`

### Original Creator
- **Merill Fernando** - [@merill](https://github.com/merill)

### Current Maintainer
- **Cengiz YILMAZ** - [@cengizyilmaz1](https://github.com/cengizyilmaz1)
- [Twitter](https://x.com/cengizyilmaz_) | [LinkedIn](https://linkedin.com/in/cengizyilmazz) | [Blog](https://cengizyilmaz.net) | [Message Center](https://message.cengizyilmaz.net)

## 📝 License

This project maintains the same open-source spirit as the original. Feel free to fork, modify, and share.

## 🔗 Related Resources

- [Microsoft 365 Admin Center](https://admin.microsoft.com)
- [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)
- [Microsoft 365 Service Health](https://status.office365.com)
- [Tenant Finder Tool](https://tenant-find.cengizyilmaz.net)

## 💬 Feedback

For feedback, suggestions, or issues:
- Open an [issue](https://github.com/cengizyilmaz1/MSMessageCenter/issues)
- Connect on [LinkedIn](https://linkedin.com/in/cengizyilmazz)
- Follow on [Twitter/X](https://x.com/cengizyilmaz_)

---

## License

This project keeps the MIT license notice intact where required.
