import Link from "next/link"

import { ListingYearGroup } from "@/lib/listing"

/**
 * Compact, complete index of a service's records, grouped by year.
 *
 * The largest service carries well over a thousand records, so rows stay to a
 * single line: an anchor plus a date. Every record is present in the HTML —
 * this is the crawl path to the detail pages, so nothing here may be truncated
 * or hidden behind client-side interaction.
 */
export function MessageIndex({ groups }: { groups: ListingYearGroup[] }) {
  const showYearNav = groups.length > 1

  return (
    <div className="flex flex-col gap-8">
      {showYearNav ? (
        <nav aria-label="Jump to year" className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.year}
              href={`#year-${group.year}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {group.year}
              <span className="tabular-nums text-muted-foreground">
                {group.items.length.toLocaleString("en-US")}
              </span>
            </a>
          ))}
        </nav>
      ) : null}

      {groups.map((group) => (
        <section key={group.year} id={`year-${group.year}`}>
          <h3 className="flex items-baseline gap-2 text-base font-semibold">
            {group.year}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              {group.items.length.toLocaleString("en-US")} updates
            </span>
          </h3>

          <ul className="mt-3 divide-y divide-border rounded-lg border">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 transition-colors hover:bg-accent/40"
              >
                <Link
                  href={item.href}
                  className="min-w-0 text-sm text-foreground underline-offset-4 hover:underline"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.id}
                  </span>{" "}
                  {item.title}
                </Link>
                {item.published ? (
                  <time className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.published}
                  </time>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
