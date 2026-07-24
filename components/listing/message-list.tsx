import Link from "next/link"

import { ListingItem } from "@/lib/listing"
import { Badge } from "@/components/ui/badge"

/**
 * Detailed listing used for the "latest" sections. Every row is a real anchor,
 * so crawlers reach the newest content without executing JavaScript.
 */
export function MessageList({ items }: { items: ListingItem[] }) {
  return (
    <ul className="divide-y divide-border rounded-lg border">
      {items.map((item) => (
        <li key={item.id} className="p-4 transition-colors hover:bg-accent/40">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={item.href}
              className="text-base font-medium text-foreground underline-offset-4 hover:underline"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {item.id}
              </span>{" "}
              {item.title}
            </Link>
            {item.isMajor ? (
              <Badge variant="destructive" className="shrink-0">
                Major change
              </Badge>
            ) : null}
          </div>

          {item.summary ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {item.summary}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.published ? (
              <span>
                Published <time>{item.published}</time>
              </span>
            ) : null}
            {item.lastUpdated ? (
              <span>
                Updated <time>{item.lastUpdated}</time>
              </span>
            ) : null}
            {item.services.slice(0, 3).map((service) => (
              <span key={service} className="rounded bg-muted px-1.5 py-0.5">
                {service}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
