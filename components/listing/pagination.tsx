import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Page navigation for a paginated listing.
 *
 * Every page number is rendered, not a prev/next pair or a window around the
 * current page: these links are the crawl path onward to the detail pages, and
 * a window would put the last page as many hops from the hub as there are
 * pages. The largest service currently needs nine, so the full set stays small.
 * Revisit if any single service ever passes ~20 pages.
 */
export function Pagination({
  currentPage,
  pageCount,
  hrefFor,
  label,
}: {
  currentPage: number
  pageCount: number
  hrefFor: (page: number) => string
  label: string
}) {
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-2.5 text-sm font-medium transition-colors hover:bg-accent"

  return (
    <nav aria-label={label} className="mt-10 flex flex-wrap items-center gap-2">
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
          rel="prev"
          className={linkClass}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          Previous
        </Link>
      ) : null}

      {pages.map((page) =>
        page === currentPage ? (
          <span
            key={page}
            aria-current="page"
            className={cn(
              linkClass,
              "border-primary bg-primary text-primary-foreground"
            )}
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            className={linkClass}
            aria-label={`Page ${page}`}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < pageCount ? (
        <Link
          href={hrefFor(currentPage + 1)}
          rel="next"
          className={linkClass}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={15} />
        </Link>
      ) : null}
    </nav>
  )
}
