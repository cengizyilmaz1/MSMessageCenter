import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * Renders every page number as a real link. A "..." style pager would leave
 * deep pages orphaned again, so the full set is emitted; the page count is
 * small enough (tens, not thousands) for this to stay cheap.
 */
export function Pagination({
  currentPage,
  pageCount,
  buildHref,
}: {
  currentPage: number
  pageCount: number
  buildHref: (page: number) => string
}) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Pagination" className="mt-6">
      <ul className="flex flex-wrap items-center gap-1.5">
        {currentPage > 1 ? (
          <li>
            <Link
              href={buildHref(currentPage - 1)}
              rel="prev"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Previous
            </Link>
          </li>
        ) : null}

        {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            <Link
              href={buildHref(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm tabular-nums hover:bg-accent",
                page === currentPage &&
                  "border-foreground bg-foreground font-semibold text-background hover:bg-foreground"
              )}
            >
              {page}
            </Link>
          </li>
        ))}

        {currentPage < pageCount ? (
          <li>
            <Link
              href={buildHref(currentPage + 1)}
              rel="next"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Next
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
