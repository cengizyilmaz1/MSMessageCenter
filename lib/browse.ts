import { MessageSource } from "@/types/message"
import {
  getArchiveMessages,
  getFormattedDate,
  getMessageDescription,
  getMessagesBySource,
  getMessageSourceLabel,
} from "@/lib/messages"
import { getCanonicalMessagePath } from "@/lib/slugs.mjs"

/**
 * Static, crawlable browse indexes.
 *
 * The main listing UI is a client-side table with in-browser pagination, which
 * means only the first slice of rows ever exists in the served HTML. Every
 * other detail page was therefore reachable only through sitemap.xml, and
 * search engines heavily deprioritise URLs that have no internal links
 * pointing at them ("Discovered - currently not indexed").
 *
 * These browse pages emit every message as a real server-rendered <a href>,
 * with a full numbered pager, so any detail page is at most three clicks from
 * the homepage.
 */

export const BROWSE_PAGE_SIZE = 100

export interface BrowseSection {
  slug: string
  title: string
  heading: string
  description: string
}

export const browseSections: BrowseSection[] = [
  {
    slug: "message-center",
    title: "Message Center announcements",
    heading: "All Microsoft 365 Message Center announcements",
    description:
      "Every active Microsoft 365 Message Center announcement in the archive, newest first.",
  },
  {
    slug: "roadmap",
    title: "Microsoft 365 Roadmap items",
    heading: "All Microsoft 365 Roadmap items",
    description:
      "Every Microsoft 365 Roadmap item tracked in the archive, newest first.",
  },
  {
    slug: "archive",
    title: "Expired announcements",
    heading: "All expired Message Center announcements",
    description:
      "Message Center announcements that have passed their expiry date, preserved for historical reference.",
  },
]

export function getBrowseSection(slug: string): BrowseSection | undefined {
  return browseSections.find((section) => section.slug === slug)
}

export interface BrowseItem {
  id: string
  title: string
  href: string
  services: string[]
  published: string
  lastUpdated: string
  summary: string
  sourceLabel: string
  isMajor: boolean
}

function toTime(value: string | undefined | null): number {
  return value ? new Date(value).getTime() || 0 : 0
}

function buildItems(sectionSlug: string): BrowseItem[] {
  if (sectionSlug === "archive") {
    return getArchiveMessages()
      .slice()
      .sort(
        (a, b) =>
          toTime(b.LastModifiedDateTime || b.StartDateTime) -
          toTime(a.LastModifiedDateTime || a.StartDateTime)
      )
      .map((item) => ({
        id: item.Id,
        title: item.Title,
        href: getCanonicalMessagePath(item),
        services: item.Services ?? [],
        published: getFormattedDate(item.StartDateTime),
        lastUpdated: getFormattedDate(item.LastModifiedDateTime),
        summary: "",
        sourceLabel: "Message Center",
        isMajor: item.IsMajorChange ?? false,
      }))
  }

  const source =
    sectionSlug === "roadmap" ? MessageSource.Roadmap : MessageSource.MessageCenter

  return getMessagesBySource(source).map((item) => ({
    id: item.Id,
    title: item.Title,
    href: getCanonicalMessagePath(item),
    services: item.Services ?? [],
    published: getFormattedDate(item.StartDateTime),
    lastUpdated: getFormattedDate(item.LastModifiedDateTime),
    summary: getMessageDescription(item),
    sourceLabel: getMessageSourceLabel(item),
    isMajor: item.IsMajorChange ?? false,
  }))
}

const itemCache = new Map<string, BrowseItem[]>()

export function getBrowseItems(sectionSlug: string): BrowseItem[] {
  const cached = itemCache.get(sectionSlug)
  if (cached) return cached
  const items = buildItems(sectionSlug)
  itemCache.set(sectionSlug, items)
  return items
}

export function getBrowsePageCount(sectionSlug: string): number {
  return Math.max(1, Math.ceil(getBrowseItems(sectionSlug).length / BROWSE_PAGE_SIZE))
}

export function getBrowsePage(sectionSlug: string, page: number): BrowseItem[] {
  const start = (page - 1) * BROWSE_PAGE_SIZE
  return getBrowseItems(sectionSlug).slice(start, start + BROWSE_PAGE_SIZE)
}

export function getBrowseStaticParams(): { section: string; page: string }[] {
  return browseSections.flatMap((section) =>
    Array.from({ length: getBrowsePageCount(section.slug) }, (_, index) => ({
      section: section.slug,
      page: String(index + 1),
    }))
  )
}

export function getBrowsePath(sectionSlug: string, page: number): string {
  return `/browse/${sectionSlug}/${page}`
}
