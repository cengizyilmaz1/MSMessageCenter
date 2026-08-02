#!/usr/bin/env node
/**
 * Legacy URL -> canonical URL redirect map.
 *
 * Why this exists
 * ---------------
 * The archive has changed its detail-page URL scheme over its lifetime:
 *
 *   old:  /message/{title-slug}/          (title only, trailing slash)
 *   now:  /message/mc{id}-{title-slug}    (id-prefixed, no trailing slash)
 *
 * Because the site is a Next.js *static export*, nothing was left behind to
 * serve the old paths: every previously indexed URL started returning 404.
 * Search engines drop 404s and discard the ranking signals attached to them, so
 * the whole indexed corpus had to be rediscovered from scratch — which is why
 * Search Console shows no coverage.
 *
 * The slug also embeds the title, so a record whose title is edited upstream
 * silently changes its canonical URL too. Every historical title therefore has
 * to redirect to the record's current canonical path as well.
 *
 * `output: "export"` means next.config.mjs `redirects()` is unavailable (there
 * is no server to run them), so the redirects are emitted as an nginx map that
 * the runtime image includes. See nginx.conf.
 *
 * Output: .generated/legacy-redirects.map — `"<key>" "<canonical path>";` lines
 * where <key> is the last URL segment, lowercased. nginx matches map strings
 * case-insensitively, so one lowercase key covers /message/MC123 too.
 */
import fs from "node:fs"
import path from "node:path"

import { getCanonicalMessagePath, slugifyTitle } from "../lib/slugs.mjs"

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, "@data")
const ARCHIVE_DIR = path.join(DATA_DIR, "archive")
const HISTORY_DIR = path.join(DATA_DIR, "history")
const OUT_DIR = path.join(ROOT, ".generated")
const OUT_FILE = path.join(OUT_DIR, "legacy-redirects.map")

// Words nginx reserves inside a map block. A title that slugifies to one of
// these would be parsed as a directive instead of a key.
const RESERVED_KEYS = new Set(["default", "hostnames", "include", "volatile"])

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

function readJsonArray(file) {
  const data = readJson(file, null)
  return Array.isArray(data) ? data : []
}

function readDirJson(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJson(path.join(dir, file), null))
      .filter(Boolean)
  } catch {
    return []
  }
}

function timeOf(record) {
  const value = record?.LastModifiedDateTime || record?.StartDateTime
  const ms = value ? Date.parse(value) : Number.NaN
  return Number.isNaN(ms) ? 0 : ms
}

function main() {
  const active = [
    ...readJsonArray(path.join(DATA_DIR, "messages.json")),
    ...readJsonArray(path.join(DATA_DIR, "roadmap.json")),
  ].filter((item) => item?.Id)

  const activeIds = new Set(active.map((item) => item.Id))
  const archived = readDirJson(ARCHIVE_DIR).filter(
    (item) => item?.Id && !activeIds.has(item.Id)
  )

  // Newest first, so when two records collide on a legacy key the more recent
  // one wins the alias.
  const records = [...active, ...archived].sort((a, b) => timeOf(b) - timeOf(a))

  /** @type {Map<string, string>} canonical path per record id */
  const canonicalById = new Map()
  for (const record of records) {
    canonicalById.set(record.Id, getCanonicalMessagePath(record))
  }

  // Every segment that is a live canonical URL today. The map is keyed by URL
  // segment alone, so an alias that collides with any of these would hijack a
  // page that currently resolves — including redirecting a URL onto itself.
  // Live pages always win over an alias.
  const canonicalSegments = new Set(
    [...canonicalById.values()].map((target) => target.split("/").pop())
  )

  /** @type {Map<string, string>} legacy key -> canonical path */
  const aliases = new Map()
  const stats = { id: 0, currentTitle: 0, historicalSlug: 0, historicalTitle: 0 }
  let skippedLive = 0

  /**
   * Records an alias. Earlier calls win, so callers must run in priority order:
   * an unambiguous id key must never be displaced by a title slug.
   */
  const addAlias = (key, target, bucket) => {
    const normalized = String(key || "").toLowerCase()
    if (!normalized || !target || RESERVED_KEYS.has(normalized)) return
    if (canonicalSegments.has(normalized)) {
      skippedLive += 1
      return
    }
    if (aliases.has(normalized)) return
    aliases.set(normalized, target)
    stats[bucket] += 1
  }

  // 1. Bare record ids (/message/mc1182713). Unambiguous, highest priority.
  for (const record of records) {
    addAlias(record.Id, canonicalById.get(record.Id), "id")
  }

  // 2. The pre-id URL scheme: title-only slug of the record's current title.
  for (const record of records) {
    addAlias(
      slugifyTitle(record.Title ?? ""),
      canonicalById.get(record.Id),
      "currentTitle"
    )
  }

  // 3. Titles are edited upstream, which moves the canonical URL. Every title a
  //    record has ever carried is replayed from its version history, in both the
  //    id-prefixed and the title-only form.
  const history = readDirJson(HISTORY_DIR)
  const historicalTitles = new Map()
  for (const entry of history) {
    const id = entry?.id
    if (!id || !canonicalById.has(id)) continue
    if (!Array.isArray(entry.versions)) continue
    const titles = new Set()
    for (const version of entry.versions) {
      const title = version?.message?.Title
      if (title) titles.add(title)
    }
    if (titles.size) historicalTitles.set(id, titles)
  }

  for (const [id, titles] of historicalTitles) {
    const target = canonicalById.get(id)
    for (const title of titles) {
      const slug = slugifyTitle(title)
      if (!slug) continue
      addAlias(`${id.toLowerCase()}-${slug}`, target, "historicalSlug")
    }
  }

  for (const [id, titles] of historicalTitles) {
    const target = canonicalById.get(id)
    for (const title of titles) {
      addAlias(slugifyTitle(title), target, "historicalTitle")
    }
  }

  const entries = [...aliases.entries()].sort(([a], [b]) => a.localeCompare(b))
  const lines = entries.map(([key, target]) => `"${key}" "${target}";`)

  // nginx rejects a map whose bucket size is smaller than its longest key, and
  // the failure is a start-up error rather than a bad redirect. Surface the
  // number the config has to satisfy instead of leaving it to be discovered on
  // deploy.
  const longestKey = entries.reduce((max, [key]) => Math.max(max, key.length), 0)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUT_FILE,
    `# Generated by scripts/build-redirects.mjs — do not edit.\n` +
      `# ${lines.length} legacy detail-page URLs -> current canonical paths.\n` +
      `# Longest key: ${longestKey} chars (map_hash_bucket_size must exceed this).\n` +
      `${lines.join("\n")}\n`
  )

  console.log(
    `[redirects] wrote ${lines.length} legacy aliases to .generated/legacy-redirects.map ` +
      `(id ${stats.id}, current title ${stats.currentTitle}, ` +
      `historical slug ${stats.historicalSlug}, historical title ${stats.historicalTitle}; ` +
      `${skippedLive} skipped as live canonical URLs; longest key ${longestKey} chars)`
  )
}

main()
