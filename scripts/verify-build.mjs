#!/usr/bin/env node
/**
 * Post-build verification of the static export.
 *
 * This exists because the failure that de-indexed the archive was invisible to
 * every other gate: `next build` succeeded, lint and typecheck passed, and the
 * site rendered fine — the URLs search engines actually held were simply not in
 * `out/` any more. Nothing in the toolchain compares the URLs the build claims
 * to publish against the files it produced.
 *
 * So these checks reduce to one question: is every URL this site advertises —
 * in its sitemaps, its internal links, its redirect map — backed by a real file,
 * and does that file agree about its own canonical URL?
 *
 * Usage: npm run verify:build   (after npm run build)
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const OUT = path.join(ROOT, "out")
const MAP_FILE = path.join(ROOT, ".generated", "legacy-redirects.map")
const SITE_URL = process.env.SITE_URL || "https://message.cengizyilmaz.net"

let failures = 0
let checks = 0

function check(name, ok, detail) {
  checks += 1
  if (ok) {
    console.log(`  PASS  ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${name}`)
    if (detail) console.log(`        ${detail}`)
  }
}

function note(detail) {
  console.log(`        ${detail}`)
}

function section(title) {
  console.log(`\n${title}`)
}

/** Maps a site-relative URL to the file the export writes for it. */
function fileForUrl(urlPath) {
  const clean = urlPath.split("#")[0].split("?")[0]
  if (clean === "/" || clean === "") return path.join(OUT, "index.html")
  const rel = clean.replace(/^\//, "")
  // Assets keep their extension; routes are written flat as `<route>.html`.
  return path.extname(rel) ? path.join(OUT, rel) : path.join(OUT, `${rel}.html`)
}

const existsCache = new Map()
function urlExists(urlPath) {
  if (!existsCache.has(urlPath)) {
    existsCache.set(urlPath, fs.existsSync(fileForUrl(urlPath)))
  }
  return existsCache.get(urlPath)
}

/**
 * Metadata all lives in <head>; reading the first 16 KB avoids pulling ~1 MB of
 * listing markup into memory 5,800 times.
 */
function readHead(file) {
  const fd = fs.openSync(file, "r")
  try {
    const buffer = Buffer.alloc(16384)
    const read = fs.readSync(fd, buffer, 0, 16384, 0)
    return buffer.subarray(0, read).toString("utf8")
  } finally {
    fs.closeSync(fd)
  }
}

const RE = {
  loc: /<loc>([^<]+)<\/loc>/g,
  canonical: /<link rel="canonical" href="([^"]+)"/,
  robots: /<meta name="robots" content="([^"]+)"/,
  title: /<title>([^<]*)<\/title>/,
  description: /<meta name="description" content="([^"]*)"/,
  internal: /href="(\/(?:message|roadmap)\/[^"#?]+)"/g,
}

function locsIn(file) {
  return [...fs.readFileSync(file, "utf8").matchAll(RE.loc)].map((m) => m[1])
}

function toPath(url) {
  return url.startsWith(SITE_URL) ? url.slice(SITE_URL.length) || "/" : url
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(OUT)) {
  console.error("out/ not found — run `npm run build` first.")
  process.exit(1)
}

section("1. Sitemap integrity")

const indexFile = path.join(OUT, "sitemap.xml")
check("sitemap.xml exists", fs.existsSync(indexFile))

const segmentUrls = fs.existsSync(indexFile) ? locsIn(indexFile) : []
check("sitemap index lists segments", segmentUrls.length > 0, `found ${segmentUrls.length}`)

const missingSegments = segmentUrls.filter((url) => !urlExists(toPath(url)))
check("every segment file exists", missingSegments.length === 0, missingSegments.join(", "))

/** Every URL the site advertises for indexing. */
const sitemapPaths = []
for (const segment of segmentUrls) {
  const file = fileForUrl(toPath(segment))
  if (fs.existsSync(file)) sitemapPaths.push(...locsIn(file).map(toPath))
}
note(`${sitemapPaths.length} URLs across ${segmentUrls.length} sitemaps`)

const missingPages = sitemapPaths.filter((p) => !urlExists(p))
check(
  "every sitemap URL has a page in out/",
  missingPages.length === 0,
  `${missingPages.length} missing, e.g. ${missingPages.slice(0, 3).join(", ")}`
)

const seenPaths = new Set()
const duplicates = []
for (const p of sitemapPaths) {
  if (seenPaths.has(p)) duplicates.push(p)
  seenPaths.add(p)
}
check("no duplicate sitemap URLs", duplicates.length === 0, duplicates.slice(0, 3).join(", "))

section("2. Canonical URLs and head metadata")

const noncanonical = []
const noindexed = []
const missingTitle = []
const missingDescription = []

for (const urlPath of sitemapPaths) {
  const head = readHead(fileForUrl(urlPath))
  const canonical = head.match(RE.canonical)?.[1]
  const robots = head.match(RE.robots)?.[1] ?? ""

  // Next drops the trailing slash from the site root when normalising metadata.
  const expected = urlPath === "/" ? SITE_URL : `${SITE_URL}${urlPath}`
  if (canonical !== expected && canonical !== `${expected}/`) {
    noncanonical.push(`${urlPath} -> ${canonical}`)
  }
  if (/noindex/.test(robots)) noindexed.push(urlPath)
  if (!head.match(RE.title)?.[1]) missingTitle.push(urlPath)
  if (!head.match(RE.description)?.[1]) missingDescription.push(urlPath)
}

check(
  "every sitemap page is self-canonical",
  noncanonical.length === 0,
  `${noncanonical.length} wrong, e.g. ${noncanonical.slice(0, 3).join(" | ")}`
)
check("no sitemap page is noindex", noindexed.length === 0, noindexed.slice(0, 5).join(", "))
check("every sitemap page has a title", missingTitle.length === 0, missingTitle.slice(0, 3).join(", "))
check(
  "every sitemap page has a description",
  missingDescription.length === 0,
  missingDescription.slice(0, 3).join(", ")
)

section("3. Version and compare pages stay out of the index")

const historyRoutes = []
for (const dir of ["message", "roadmap"]) {
  const base = path.join(OUT, dir)
  if (!fs.existsSync(base)) continue
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".html")) {
        const rel = `/${path.relative(OUT, full).replace(/\\/g, "/").slice(0, -5)}`
        if (/\/v\//.test(rel) || rel.endsWith("/compare")) historyRoutes.push(rel)
      }
    }
  }
  walk(base)
}
note(`${historyRoutes.length} version/compare pages`)

const indexableHistory = historyRoutes.filter(
  (rel) => !/noindex/.test(readHead(fileForUrl(rel)).match(RE.robots)?.[1] ?? "")
)
check(
  "all version/compare pages are noindex",
  indexableHistory.length === 0,
  `${indexableHistory.length}, e.g. ${indexableHistory.slice(0, 5).join(", ")}`
)

const historySet = new Set(historyRoutes)
const historyInSitemap = sitemapPaths.filter((p) => historySet.has(p))
check(
  "no version/compare page is in a sitemap",
  historyInSitemap.length === 0,
  historyInSitemap.slice(0, 5).join(", ")
)

section("4. Crawl path — every detail page is linked, not sitemap-only")

const detailPaths = sitemapPaths.filter((p) => /^\/(?:message|roadmap)\//.test(p))
const servicePaths = sitemapPaths.filter((p) => /^\/service\//.test(p))

const linked = new Set()
for (const servicePath of servicePaths) {
  const html = fs.readFileSync(fileForUrl(servicePath), "utf8")
  for (const match of html.matchAll(RE.internal)) linked.add(match[1])
}
note(`${servicePaths.length} service pages link to ${linked.size} distinct detail pages`)

const orphans = detailPaths.filter((p) => !linked.has(p))
check(
  "every detail page is reachable from a service page",
  orphans.length === 0,
  `${orphans.length} orphaned, e.g. ${orphans.slice(0, 5).join(", ")}`
)

const dangling = [...linked].filter((p) => !urlExists(p))
check(
  "no service page links to a missing detail page",
  dangling.length === 0,
  `${dangling.length}, e.g. ${dangling.slice(0, 5).join(", ")}`
)

section("5. Service pagination")

const hubs = servicePaths.filter((p) => !/\/\d+$/.test(p))
const paginated = servicePaths.filter((p) => /\/\d+$/.test(p))
note(`${hubs.length} hubs, ${paginated.length} pagination pages`)

check(
  "no /1 pagination page was generated",
  !paginated.some((p) => p.endsWith("/1")) && !urlExists(`${hubs[0]}/1`),
  paginated.filter((p) => p.endsWith("/1")).join(", ")
)

const pagesByService = new Map()
for (const p of servicePaths) {
  const match = p.match(/^\/service\/([^/]+?)(?:\/(\d+))?$/)
  if (!match) continue
  const [, slug, page] = match
  if (!pagesByService.has(slug)) pagesByService.set(slug, new Set())
  pagesByService.get(slug).add(Number(page ?? 1))
}

const gapped = []
const brokenNav = []
for (const [slug, pageSet] of pagesByService) {
  const pages = [...pageSet].sort((a, b) => a - b)
  if (pages.some((p, i) => p !== i + 1)) gapped.push(`${slug}: ${pages.join(",")}`)
  if (pages.length < 2) continue

  // Every page must link to every other, so none is more than one hop from the
  // hub — prev/next alone would bury the last page as deep as the page count.
  for (const page of pages) {
    const urlPath = page === 1 ? `/service/${slug}` : `/service/${slug}/${page}`
    const html = fs.readFileSync(fileForUrl(urlPath), "utf8")
    for (const other of pages) {
      if (other === page) continue
      const target = other === 1 ? `/service/${slug}"` : `/service/${slug}/${other}"`
      if (!html.includes(`href="${target}`)) {
        brokenNav.push(`${urlPath} misses page ${other}`)
      }
    }
  }
}

check("page numbers are contiguous from 1", gapped.length === 0, gapped.slice(0, 3).join(" | "))
check(
  "every paginated page links to all its siblings",
  brokenNav.length === 0,
  `${brokenNav.length}, e.g. ${brokenNav.slice(0, 3).join(" | ")}`
)

section("6. Legacy redirect map")

if (!fs.existsSync(MAP_FILE)) {
  check("legacy-redirects.map exists", false, MAP_FILE)
} else {
  const entries = fs
    .readFileSync(MAP_FILE, "utf8")
    .split("\n")
    .map((line) => line.match(/^"([^"]+)" "([^"]+)";$/))
    .filter(Boolean)
    .map((m) => ({ key: m[1], target: m[2] }))

  note(`${entries.length} redirect entries`)
  check("map is not empty", entries.length > 0)

  const badTargets = entries.filter((e) => !urlExists(e.target))
  check(
    "every redirect target is a real page",
    badTargets.length === 0,
    `${badTargets.length}, e.g. ${badTargets
      .slice(0, 3)
      .map((e) => `${e.key} -> ${e.target}`)
      .join(" | ")}`
  )

  // A key that is also a live page would 301 that page away — a self-inflicted
  // outage for whatever currently ranks on it.
  const hijacked = entries.filter(
    (e) => urlExists(`/message/${e.key}`) || urlExists(`/roadmap/${e.key}`)
  )
  check(
    "no redirect key shadows a live page",
    hijacked.length === 0,
    `${hijacked.length}, e.g. ${hijacked.slice(0, 3).map((e) => e.key).join(", ")}`
  )

  const longest = entries.reduce((max, e) => Math.max(max, e.key.length), 0)
  check(
    "longest key fits nginx map_hash_bucket_size 256",
    longest < 256,
    `longest key is ${longest} chars`
  )

  // URLs Google is known to still hold, from the pre-id scheme.
  const byKey = new Map(entries.map((e) => [e.key, e.target]))
  for (const key of [
    "mc1182713",
    "microsoft-sharepoint-update-to-news-web-part-see-all-experience",
  ]) {
    const target = byKey.get(key)
    check(`legacy "${key}" resolves`, Boolean(target) && urlExists(target), target ?? "not in map")
  }
}

section("7. Crawler-facing files")

for (const file of [
  "robots.txt",
  "llms.txt",
  "rss.xml",
  "messages-index.json",
  "search-index.json",
]) {
  check(`${file} published`, fs.existsSync(path.join(OUT, file)))
}

const robotsFile = path.join(OUT, "robots.txt")
const robots = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, "utf8") : ""
check(
  "robots.txt points at the sitemap index",
  robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`),
  robots.slice(0, 200)
)
check("robots.txt does not disallow the site", !/^Disallow:\s*\/\s*$/m.test(robots))

section("8. nginx routing (simulated against out/)")

/*
 * This replays nginx.conf's routing decisions in JS against the real export.
 * It is not a substitute for `nginx -t` — that runs in the Docker build stage
 * and catches syntax errors — but syntax is not what breaks here. What breaks
 * is a rule that sends a live page somewhere, or leaves a legacy URL 404ing,
 * and those are only visible by resolving real URLs against real files.
 *
 * Keep the constants below in step with nginx.conf.
 */
const LEGACY_KEY_RE = /^\/(?:message|roadmap)\/([^/]+?)(?:\.html)?\/?$/i

const redirectMap = fs.existsSync(MAP_FILE)
  ? new Map(
      fs
        .readFileSync(MAP_FILE, "utf8")
        .split("\n")
        .map((line) => line.match(/^"([^"]+)" "([^"]+)";$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]])
    )
  : new Map()

/** @returns {{status: 200|301|404, location?: string}} */
function resolve(urlPath) {
  // 1. Legacy map, evaluated at server level before any location.
  const key = urlPath.match(LEGACY_KEY_RE)?.[1]
  if (key) {
    const target = redirectMap.get(key.toLowerCase())
    if (target) return { status: 301, location: target }
  }
  // 2. Exact-match locations.
  if (urlPath === "/") return { status: urlExists("/") ? 200 : 404 }
  if (urlPath === "/index.html") return { status: 301, location: "/" }
  // 3. Regex locations, in file order.
  const pageOne = urlPath.match(/^(\/service\/[^/]+)\/1$/)
  if (pageOne) return { status: 301, location: pageOne[1] }
  if (/^\/.+\.html$/.test(urlPath)) {
    return { status: 301, location: urlPath.replace(/\.html$/, "") }
  }
  if (/^\/.+\/$/.test(urlPath)) {
    return { status: 301, location: urlPath.replace(/\/$/, "") }
  }
  // 4. location / — try_files $uri $uri.html =404
  return { status: urlExists(urlPath) ? 200 : 404 }
}

/** Follows redirects and reports the chain, so a 301 -> 301 is visible. */
function trace(urlPath, limit = 5) {
  const chain = [urlPath]
  let current = urlPath
  for (let i = 0; i < limit; i += 1) {
    const result = resolve(current)
    if (result.status !== 301) return { chain, final: result }
    if (chain.includes(result.location)) {
      return { chain: [...chain, result.location], final: { status: 508 } }
    }
    chain.push(result.location)
    current = result.location
  }
  return { chain, final: { status: 599 } }
}

const sampleDetail = detailPaths.find((p) => p.startsWith("/message/")) ?? ""
const sampleService = hubs.find((h) => pagesByService.get(h.split("/").pop())?.size > 1) ?? hubs[0]
const sampleVersion = historyRoutes.find((r) => /\/v\//.test(r))
const sampleCompare = historyRoutes.find((r) => r.endsWith("/compare"))
const legacyKey = "microsoft-sharepoint-update-to-news-web-part-see-all-experience"

const cases = [
  // [url, expected status, expected final destination]
  ["/", 200, null],
  ["/index.html", 200, "/"],
  ["/about", 200, null],
  ["/about.html", 200, "/about"],
  ["/about/", 200, "/about"],
  [sampleDetail, 200, null],
  [`${sampleDetail}/`, 200, sampleDetail],
  [`${sampleDetail}.html`, 200, sampleDetail],
  ["/message/mc1182713", 200, redirectMap.get("mc1182713")],
  ["/message/MC1182713", 200, redirectMap.get("mc1182713")],
  [`/message/${legacyKey}/`, 200, redirectMap.get(legacyKey)],
  [`/message/${legacyKey}`, 200, redirectMap.get(legacyKey)],
  [sampleService, 200, null],
  [`${sampleService}/1`, 200, sampleService],
  [`${sampleService}/2`, 200, null],
  [sampleVersion, 200, null],
  [sampleCompare, 200, null],
  ["/message/does-not-exist-at-all", 404, null],
  ["/definitely-not-a-page", 404, null],
]

const routingFailures = []
for (const [url, expectedStatus, expectedFinal] of cases) {
  if (!url) continue
  const { chain, final } = trace(url)
  const destination = chain[chain.length - 1]
  const okStatus = final.status === expectedStatus
  const okDestination = expectedFinal === null || destination === expectedFinal
  // More than one redirect wastes crawl budget and dilutes the signal a 301
  // passes; every legacy URL must reach its target in a single hop.
  const okHops = chain.length <= 2
  if (!okStatus || !okDestination || !okHops) {
    routingFailures.push(
      `${url} -> ${chain.join(" -> ")} [${final.status}]` +
        (expectedFinal && destination !== expectedFinal ? ` (want ${expectedFinal})` : "") +
        (okHops ? "" : " (multi-hop)")
    )
  }
}
check(
  `${cases.filter(([u]) => u).length} routing cases resolve as configured`,
  routingFailures.length === 0,
  routingFailures.join("\n        ")
)

// Nested routes must not be captured by the legacy map, or every compare and
// version page would 301 to its parent.
const nestedCaptured = [sampleVersion, sampleCompare]
  .filter(Boolean)
  .filter((r) => LEGACY_KEY_RE.test(r))
check(
  "legacy map regex ignores nested /compare and /v/ routes",
  nestedCaptured.length === 0,
  nestedCaptured.join(", ")
)

// Redirect chains across the whole map, not just the samples.
const chained = []
for (const [key, target] of redirectMap) {
  const result = resolve(target)
  if (result.status !== 200) chained.push(`${key} -> ${target} [${result.status}]`)
}
check(
  "every redirect lands on a 200, never another redirect",
  chained.length === 0,
  `${chained.length}, e.g. ${chained.slice(0, 3).join(" | ")}`
)

// Nothing currently indexable may be redirected away.
const liveRedirected = sitemapPaths.filter((p) => resolve(p).status !== 200)
check(
  "no sitemap URL is redirected or 404s",
  liveRedirected.length === 0,
  `${liveRedirected.length}, e.g. ${liveRedirected.slice(0, 5).join(", ")}`
)

// ---------------------------------------------------------------------------

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed`
)
process.exit(failures === 0 ? 0 : 1)
