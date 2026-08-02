/**
 * Service-hub pagination.
 *
 * Service pages are the crawl path to every detail page — each record carries at
 * least one service, so a service's full record set is what puts detail pages
 * within a few clicks of the homepage. That made them enormous: the largest
 * shipped 1,223 anchors in 1.6 MB of HTML, which is slow for readers and spends
 * crawl budget badly, and a link on a page of 1,223 carries very little weight.
 *
 * Pagination has to preserve the invariant that every record stays reachable
 * through a real anchor, so:
 *
 *   - Pages are distributed *evenly*, not filled to the cap. A service with 155
 *     records becomes 78 + 77, never 150 + 5 — a five-record page is thin
 *     content that dilutes the service rather than adding to it.
 *   - Services at or below the cap are never split, which keeps 51 of the 63
 *     services on a single page.
 *   - Every page links to every other page (the largest service needs nine), so
 *     no page is more than one hop from the hub. Prev/next alone would bury the
 *     last page nine levels deep.
 *
 * This module is .mjs because both the app (TypeScript) and the sitemap
 * generator (plain Node) must agree on the exact page boundaries.
 */

/** Upper bound on records per page. Actual pages are smaller and even-sized. */
export const SERVICE_PAGE_SIZE = 150

/**
 * @param {number} total
 * @returns {number} number of pages, always >= 1
 */
export function getPageCount(total) {
  if (!Number.isFinite(total) || total <= SERVICE_PAGE_SIZE) return 1
  return Math.ceil(total / SERVICE_PAGE_SIZE)
}

/**
 * Records per page once `total` is spread evenly across its pages.
 *
 * @param {number} total
 * @returns {number}
 */
export function getPerPage(total) {
  const pages = getPageCount(total)
  return pages <= 1 ? Math.max(total, 0) : Math.ceil(total / pages)
}

/**
 * The slice of `items` shown on a 1-based page number.
 *
 * @template T
 * @param {T[]} items
 * @param {number} page
 * @returns {T[]}
 */
export function getPageSlice(items, page) {
  const perPage = getPerPage(items.length)
  if (getPageCount(items.length) <= 1) return items
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}

/**
 * Canonical path for a service page. Page 1 is the hub itself — a `/1` suffix
 * would be a second URL for the same content.
 *
 * @param {string} serviceSlug
 * @param {number} page
 * @returns {string}
 */
export function getServicePagePath(serviceSlug, page) {
  return page <= 1 ? `/service/${serviceSlug}` : `/service/${serviceSlug}/${page}`
}

/**
 * Every page number for a service, so callers can enumerate static params or
 * sitemap entries without repeating the arithmetic.
 *
 * @param {number} total
 * @returns {number[]}
 */
export function getPageNumbers(total) {
  return Array.from({ length: getPageCount(total) }, (_, index) => index + 1)
}
