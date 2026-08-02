import { Message, MessageArchive, MessageSource } from "@/types/message"
import {
  getArchiveMessages,
  getFormattedDate,
  getMessageDescription,
  getMessagesByService,
  getMessagesBySource,
  getMessageSourceLabel,
} from "@/lib/messages"
import { getCanonicalMessagePath, slugifyService } from "@/lib/slugs.mjs"

/**
 * Server-rendered listing primitives.
 *
 * The main listing UI is a client-side table that paginates in the browser, so
 * only the first slice of rows ever exists in the served HTML. Search engines
 * heavily deprioritise URLs that no page links to ("Discovered - currently not
 * indexed"), which left every detail page reachable through sitemap.xml alone.
 *
 * The service pages close that gap: every record carries at least one service,
 * so rendering a service's full set of records as real anchors puts every
 * detail page two clicks from the homepage without a crawler-only section.
 */

export type ListingSection = "message-center" | "roadmap" | "archive"

export interface ListingItem {
  id: string
  title: string
  href: string
  services: string[]
  published: string
  lastUpdated: string
  summary: string
  sourceLabel: string
  isMajor: boolean
  year: string
  sortKey: number
}

export interface ListingYearGroup {
  year: string
  items: ListingItem[]
}

type ListingSource = Message | MessageArchive

function toTime(value: string | undefined | null): number {
  return value ? new Date(value).getTime() || 0 : 0
}

function getYear(item: ListingSource): string {
  const stamp = item.StartDateTime || item.LastModifiedDateTime
  const year = stamp ? new Date(stamp).getFullYear() : NaN
  return Number.isFinite(year) ? String(year) : "Undated"
}

/**
 * Summaries and source labels need the full message body, which archive index
 * entries do not carry. They are also the expensive part of building a listing,
 * so the compact indexes opt out of them.
 */
export function toListingItems(
  items: ListingSource[],
  options: { summaries?: boolean } = {}
): ListingItem[] {
  const withSummary = options.summaries ?? true

  return items
    .map((item) => ({
      id: item.Id,
      title: item.Title,
      href: getCanonicalMessagePath(item as Message),
      services: item.Services ?? [],
      published: getFormattedDate(item.StartDateTime),
      lastUpdated: getFormattedDate(item.LastModifiedDateTime),
      summary: withSummary ? getMessageDescription(item as Message) : "",
      sourceLabel: withSummary
        ? getMessageSourceLabel(item as Message)
        : "Message Center",
      isMajor: item.IsMajorChange ?? false,
      year: getYear(item),
      sortKey: toTime(item.LastModifiedDateTime || item.StartDateTime),
    }))
    .sort((a, b) => b.sortKey - a.sortKey)
}

/** Drops records that appear in more than one input set (active + archive). */
export function dedupeById<T extends { Id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.Id)) return false
    seen.add(item.Id)
    return true
  })
}

export function groupByYear(items: ListingItem[]): ListingYearGroup[] {
  const groups = new Map<string, ListingItem[]>()
  for (const item of items) {
    const group = groups.get(item.year)
    if (group) group.push(item)
    else groups.set(item.year, [item])
  }

  return [...groups.entries()]
    .map(([year, groupItems]) => ({ year, items: groupItems }))
    .sort((a, b) => {
      if (a.year === "Undated") return 1
      if (b.year === "Undated") return -1
      return Number(b.year) - Number(a.year)
    })
}

const serviceListingCache = new Map<string, ListingItem[]>()

/**
 * Every record recorded against a service — active, roadmap and archived —
 * newest first.
 *
 * The build renders one page per service plus one per pagination page, and each
 * of those needs the same full listing to slice from, so it is built once per
 * service and reused.
 */
export function getServiceListing(service: string): ListingItem[] {
  const serviceSlug = slugifyService(service)
  const cached = serviceListingCache.get(serviceSlug)
  if (cached) return cached

  const archiveMessages = getArchiveMessages().filter((item) =>
    item.Services?.some((s) => slugifyService(s) === serviceSlug)
  )
  const items = toListingItems(
    dedupeById([...getMessagesByService(service), ...archiveMessages]),
    { summaries: false }
  )

  serviceListingCache.set(serviceSlug, items)
  return items
}

const sectionCache = new Map<ListingSection, ListingItem[]>()

/** Newest-first listing for a top-level section, built once per process. */
export function getListingItems(section: ListingSection): ListingItem[] {
  const cached = sectionCache.get(section)
  if (cached) return cached

  const items =
    section === "archive"
      ? toListingItems(getArchiveMessages(), { summaries: false })
      : toListingItems(
          getMessagesBySource(
            section === "roadmap"
              ? MessageSource.Roadmap
              : MessageSource.MessageCenter
          )
        )

  sectionCache.set(section, items)
  return items
}
