#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

import { getCanonicalMessageUrl, slugifyService } from "../lib/slugs.mjs"
import { getPageNumbers, getServicePagePath } from "../lib/pagination.mjs"

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, "@data")
const PUBLIC_DIR = path.join(ROOT, "public")
const ARCHIVE_DIR = path.join(DATA_DIR, "archive")
const HISTORY_DIR = path.join(DATA_DIR, "history")
const PUBLIC_HISTORY_DIR = path.join(PUBLIC_DIR, "history")
const PUBLIC_SITEMAP_DIR = path.join(PUBLIC_DIR, "sitemaps")
const SITE_URL = process.env.SITE_URL || "https://message.cengizyilmaz.net"

// The sitemaps protocol caps a single file at 50,000 URLs. Chunk well below it
// so a growth spurt in the archive can never silently truncate coverage.
const SITEMAP_CHUNK_SIZE = 25000

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

// Required source files must parse to an array. Failing loudly here prevents a
// corrupt/missing messages.json or roadmap.json from silently overwriting the
// public index and RSS with empty data (which would gut the live site).
function readRequiredJson(file) {
  let raw
  try {
    raw = fs.readFileSync(file, "utf8")
  } catch (err) {
    console.error(`[feeds] FATAL: required source file is missing: ${file} (${err.message})`)
    process.exit(1)
  }
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) throw new Error("expected a JSON array")
    return data
  } catch (err) {
    console.error(`[feeds] FATAL: required source file is invalid JSON: ${file} (${err.message})`)
    process.exit(1)
  }
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function limitText(value = "", maxLength = 500) {
  const clean = String(value).replace(/\s+/g, " ").trim()
  if (clean.length <= maxLength) return clean

  return `${clean.slice(0, maxLength).trim()}...`
}

function getDetailValue(item, name) {
  return item?.Details?.find((detail) => detail?.Name === name)?.Value ?? ""
}

function getMessageSummaryText(item) {
  const summary =
    getDetailValue(item, "Summary") ||
    item?.Body?.Markdown ||
    stripHtml(item?.Body?.Content)

  return limitText(summary)
}

function getMessageSource(item) {
  return item?.Source === "roadmap" ? "roadmap" : "messageCenter"
}

function getMessageSourceLabel(item) {
  return getMessageSource(item) === "roadmap"
    ? "Microsoft 365 Roadmap"
    : "Message Center"
}

function toIndexRecord(item) {
  return {
    Id: item.Id,
    Title: item.Title,
    Source: getMessageSource(item),
    Url: getCanonicalMessageUrl(item, SITE_URL),
    Services: item.Services ?? [],
    StartDateTime: item.StartDateTime,
    EndDateTime: item.EndDateTime,
    LastModifiedDateTime: item.LastModifiedDateTime,
    IsMajorChange: item.IsMajorChange ?? false,
    Category: item.Category,
    Tags: item.Tags ?? [],
    Summary: getMessageSummaryText(item),
  }
}

function escapeXml(value = "") {
  return String(value)
    // Strip C0 control chars that are illegal in XML 1.0 — a single one anywhere
    // in the feed makes the whole rss.xml non-well-formed and rejected by readers.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function getRssDate(item) {
  const value = item.LastModifiedDateTime || item.StartDateTime
  const date = new Date(value)
  // Guard against a missing/unparseable date producing the literal "Invalid Date"
  // string, which would make <pubDate>/<lastBuildDate> invalid.
  return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString()
}

function toRssItem(item) {
  const source = getMessageSourceLabel(item)
  const url = getCanonicalMessageUrl(item, SITE_URL)
  const categories = [source, ...(item.Services ?? [])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
  const categoryXml = categories
    .map((category) => `    <category>${escapeXml(category)}</category>`)
    .join("\n")

  return `  <item>
    <title>${escapeXml(`${item.Id}: ${item.Title}`)}</title>
    <link>${escapeXml(url)}</link>
    <guid isPermaLink="true">${escapeXml(url)}</guid>
    <pubDate>${getRssDate(item)}</pubDate>
    <description>${escapeXml(getMessageSummaryText(item))}</description>
${categoryXml}
  </item>`
}

function readArchiveOnly(activeIds) {
  if (!fs.existsSync(ARCHIVE_DIR)) return []

  return fs
    .readdirSync(ARCHIVE_DIR)
    .filter((file) => file.endsWith(".json"))
    .filter((file) => !activeIds.has(file.slice(0, -5)))
    .map((file) => readJson(path.join(ARCHIVE_DIR, file), null))
    .filter((item) => item?.Id && item?.Title)
}

function sortByLatest(items) {
  return [...items].sort((a, b) => {
    const cmp = String(b.LastModifiedDateTime || b.StartDateTime || "").localeCompare(
      String(a.LastModifiedDateTime || a.StartDateTime || "")
    )
    // Stable, OS-independent tiebreaker so equal-timestamp records don't reorder
    // between the Linux CI build and a Windows dev regen (keeps output reproducible).
    return cmp !== 0 ? cmp : String(a.Id).localeCompare(String(b.Id))
  })
}

function writePublicHistory() {
  fs.rmSync(PUBLIC_HISTORY_DIR, { force: true, recursive: true })
  fs.mkdirSync(PUBLIC_HISTORY_DIR, { recursive: true })

  if (!fs.existsSync(HISTORY_DIR)) {
    console.log("[feeds] no history directory found")
    return
  }

  let count = 0
  for (const file of fs.readdirSync(HISTORY_DIR)) {
    if (!file.endsWith(".json")) continue
    const source = path.join(HISTORY_DIR, file)
    const target = path.join(PUBLIC_HISTORY_DIR, file)
    const history = readJson(source, null)
    if (!history?.id || !Array.isArray(history.versions)) continue
    fs.writeFileSync(target, JSON.stringify(history))
    count += 1
  }

  console.log(`[feeds] wrote ${count} history files to public/history`)
}

/**
 * Compact feed backing the interactive table.
 *
 * The table used to receive the whole dataset as a server prop, which meant
 * every record was serialised into the HTML of the home, roadmap, archive and
 * service pages — the archive page alone shipped ~1.9 MB before a single row
 * was visible. The browser now fetches this file after hydration instead.
 *
 * The shape is deliberately terse: a shared service dictionary plus positional
 * rows, since object keys and repeated service names dominated the size.
 * Detail URLs are omitted because the client derives them from Id and Title
 * with the same slug helpers the build uses.
 *
 * Row layout:
 *   0 Id, 1 Title, 2 source (0 message centre, 1 roadmap), 3 service indexes,
 *   4 category, 5 published, 6 last modified, 7 action required by,
 *   8 major change flag, 9 archived flag
 */
function writeTableIndex(activeItems, archiveOnlyItems) {
  const archivedIds = new Set(archiveOnlyItems.map((item) => item.Id))
  const sorted = sortByLatest([...activeItems, ...archiveOnlyItems])

  const serviceNames = []
  const serviceIndex = new Map()
  const indexFor = (name) => {
    if (!serviceIndex.has(name)) {
      serviceIndex.set(name, serviceNames.length)
      serviceNames.push(name)
    }
    return serviceIndex.get(name)
  }

  // The table only renders a formatted day, so the time component is dropped.
  const day = (value) => (value ? String(value).slice(0, 10) : "")

  const rows = sorted.map((item) => [
    item.Id,
    item.Title ?? "",
    getMessageSource(item) === "roadmap" ? 1 : 0,
    (item.Services ?? []).filter(Boolean).map(indexFor),
    item.Category ?? "",
    day(item.StartDateTime),
    day(item.LastModifiedDateTime),
    day(item.ActionRequiredByDateTime),
    item.IsMajorChange ? 1 : 0,
    archivedIds.has(item.Id) ? 1 : 0,
  ])

  const payload = JSON.stringify({ services: serviceNames, rows })
  fs.writeFileSync(path.join(PUBLIC_DIR, "table-index.json"), payload)
  console.log(
    `[feeds] wrote ${rows.length} rows to table-index.json (${Math.round(payload.length / 1024)} KB)`
  )
}

// ---------------------------------------------------------------------------
// Sitemaps
// ---------------------------------------------------------------------------

/**
 * A sitemap index plus one sitemap per content type, rather than the single
 * flat file this used to emit from app/sitemap.ts.
 *
 * Search Console reports discovered/indexed counts per submitted sitemap, so
 * splitting Message Center, Roadmap, service hubs and static pages apart turns
 * "the site isn't indexed" into a per-section number. It is the only way to see
 * which part of the archive a crawler is actually taking, and it costs nothing.
 */
function toW3cDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toUrlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "<url>",
    `<loc>${escapeXml(loc)}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    changefreq ? `<changefreq>${changefreq}</changefreq>` : "",
    priority !== undefined ? `<priority>${priority}</priority>` : "",
    "</url>",
  ]
    .filter(Boolean)
    .join("")
}

function renderUrlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(toUrlEntry).join("\n")}
</urlset>
`
}

function renderSitemapIndex(files) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files
  .map(({ loc, lastmod }) =>
    [
      "<sitemap>",
      `<loc>${escapeXml(loc)}</loc>`,
      lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
      "</sitemap>",
    ]
      .filter(Boolean)
      .join("")
  )
  .join("\n")}
</sitemapindex>
`
}

/**
 * @param {any[]} indexRecords every detail page, in canonical form
 * @param {any[]} serviceRecords the exact record set the service pages build
 *   from: messages.json + roadmap.json + messages-archive.json, deduplicated by
 *   id. It has to mirror lib/listing.ts getServiceListing() record for record —
 *   the page count is derived from its length, so reading a different archive
 *   source here would put pagination URLs in the sitemap that the build never
 *   generates (or omit ones it did).
 */
function writeSitemaps(indexRecords, serviceRecords) {
  fs.rmSync(PUBLIC_SITEMAP_DIR, { force: true, recursive: true })
  fs.mkdirSync(PUBLIC_SITEMAP_DIR, { recursive: true })

  // Newest record timestamp, used as a deterministic site-wide lastmod for
  // pages that have no meaningful date of their own. Deriving it from the data
  // (rather than the clock) keeps rebuilds reproducible and stops every hub
  // page from claiming it changed on every deploy.
  const siteLastmod =
    indexRecords
      .map((record) => toW3cDate(record.LastModifiedDateTime || record.StartDateTime))
      .filter(Boolean)
      .sort()
      .pop() ?? null

  const detailEntry = (record) => ({
    loc: record.Url,
    lastmod: toW3cDate(record.LastModifiedDateTime || record.StartDateTime),
    changefreq: "weekly",
    priority: 0.7,
  })

  const messageCenter = indexRecords
    .filter((record) => record.Source !== "roadmap")
    .map(detailEntry)
  const roadmap = indexRecords
    .filter((record) => record.Source === "roadmap")
    .map(detailEntry)

  const pages = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: 1 },
    { loc: `${SITE_URL}/service`, changefreq: "weekly", priority: 0.8 },
    { loc: `${SITE_URL}/roadmap`, changefreq: "weekly", priority: 0.8 },
    { loc: `${SITE_URL}/archive`, changefreq: "weekly", priority: 0.8 },
    { loc: `${SITE_URL}/about`, changefreq: "monthly", priority: 0.5 },
  ].map((entry) => ({ ...entry, lastmod: siteLastmod }))

  // Service hubs list every record for their service as real anchors, so they
  // are the crawl path into the detail pages and rank above the other hubs.
  // Service names arrive unnormalised (stray casing/whitespace); collapse them
  // by slug so one URL is not emitted twice.
  const recordsBySlug = new Map()
  for (const record of serviceRecords) {
    const slugs = new Set(
      (record.Services ?? [])
        .map((service) => slugifyService(String(service ?? "").trim()))
        .filter(Boolean)
    )
    for (const slug of slugs) {
      recordsBySlug.set(slug, (recordsBySlug.get(slug) ?? 0) + 1)
    }
  }

  // Large services are paginated, and those pages are indexable, self-canonical
  // and the only anchors to the records past the first page — so they belong in
  // the sitemap alongside the hubs.
  const services = [...recordsBySlug.keys()].sort().flatMap((slug) =>
    getPageNumbers(recordsBySlug.get(slug)).map((page) => ({
      loc: `${SITE_URL}${getServicePagePath(slug, page)}`,
      lastmod: siteLastmod,
      changefreq: "daily",
      // The hub carries the newest records and is what other pages link to.
      priority: page === 1 ? 0.8 : 0.6,
    }))
  )

  const sections = [
    { name: "pages", entries: pages },
    { name: "services", entries: services },
    { name: "messages", entries: messageCenter },
    { name: "roadmap", entries: roadmap },
  ]

  const written = []
  for (const { name, entries } of sections) {
    if (!entries.length) continue
    const chunks = []
    for (let i = 0; i < entries.length; i += SITEMAP_CHUNK_SIZE) {
      chunks.push(entries.slice(i, i + SITEMAP_CHUNK_SIZE))
    }
    chunks.forEach((chunk, index) => {
      const file = chunks.length > 1 ? `${name}-${index + 1}.xml` : `${name}.xml`
      fs.writeFileSync(path.join(PUBLIC_SITEMAP_DIR, file), renderUrlset(chunk))
      const lastmod =
        chunk
          .map((entry) => entry.lastmod)
          .filter(Boolean)
          .sort()
          .pop() ?? siteLastmod
      written.push({ loc: `${SITE_URL}/sitemaps/${file}`, lastmod, count: chunk.length })
    })
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), renderSitemapIndex(written))
  console.log(
    `[feeds] wrote sitemap index with ${written.length} sitemaps: ` +
      written.map((entry) => `${path.basename(entry.loc)} (${entry.count})`).join(", ")
  )
}

function main() {
  const messages = readRequiredJson(path.join(DATA_DIR, "messages.json"))
  const roadmap = readRequiredJson(path.join(DATA_DIR, "roadmap.json"))
  const activeIds = new Set([...messages, ...roadmap].map((item) => item.Id))
  const archiveOnly = readArchiveOnly(activeIds)

  const indexRecords = sortByLatest([...messages, ...roadmap, ...archiveOnly]).map(
    toIndexRecord
  )
  const indexJson = JSON.stringify(indexRecords)
  fs.writeFileSync(path.join(DATA_DIR, "messages-index.json"), indexJson)
  fs.writeFileSync(path.join(PUBLIC_DIR, "messages-index.json"), indexJson)
  console.log(`[feeds] wrote ${indexRecords.length} records to messages-index.json`)

  // Slim index for the client-side search palette: only the fields the search
  // UI reads (Id/Title/Source/Url/Services). The full messages-index.json keeps
  // Summary/dates/tags for AI and machine consumers. This roughly thirds the
  // payload the browser downloads when a user opens search.
  const searchRecords = indexRecords.map((record) => ({
    Id: record.Id,
    Title: record.Title,
    Source: record.Source,
    Url: record.Url,
    Services: record.Services,
  }))
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "search-index.json"),
    JSON.stringify(searchRecords)
  )
  console.log(`[feeds] wrote ${searchRecords.length} records to search-index.json`)

  writeTableIndex([...messages, ...roadmap], archiveOnly)

  // Mirrors lib/messages.ts: the service pages read the slim archive index, not
  // the per-record archive files that indexRecords is built from.
  const archiveIndex = readJson(path.join(DATA_DIR, "messages-archive.json"), [])
  const serviceRecords = []
  const seenServiceIds = new Set()
  for (const record of [...messages, ...roadmap, ...archiveIndex]) {
    if (!record?.Id || seenServiceIds.has(record.Id)) continue
    seenServiceIds.add(record.Id)
    serviceRecords.push(record)
  }

  writeSitemaps(indexRecords, serviceRecords)

  const pathMap = Object.fromEntries(
    indexRecords.map((record) => [
      record.Id,
      new URL(record.Url).pathname,
    ])
  )
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "message-paths.json"),
    JSON.stringify(pathMap)
  )
  console.log(`[feeds] wrote ${Object.keys(pathMap).length} message paths`)

  writePublicHistory()

  const rssItems = sortByLatest([...messages, ...roadmap]).slice(0, 500)
  const lastBuildDate = rssItems[0] ? getRssDate(rssItems[0]) : new Date().toUTCString()
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Microsoft 365 Message Center and Roadmap Archive</title>
  <link>${SITE_URL}/</link>
  <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Latest Microsoft 365 Message Center messages and Microsoft 365 Roadmap posts from message.cengizyilmaz.net. Message Center posts vary by tenant; always use your tenant's Message Center as the source of truth.</description>
  <language>en-us</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <ttl>60</ttl>
${rssItems.map(toRssItem).join("\n")}
</channel>
</rss>
`

  fs.writeFileSync(path.join(PUBLIC_DIR, "rss.xml"), rssXml)
  console.log(`[feeds] wrote ${rssItems.length} items to public/rss.xml`)
}

main()
