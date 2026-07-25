import Link from "next/link"
import { Archive, Info, Layers, Milestone, Rss } from "lucide-react"

import MessagesTable, { SERVER_ROWS } from "@/components/table/messages-table"
import { siteConfig } from "@/config/site"
import { JsonLd } from "@/components/seo/json-ld"
import { toListingItems } from "@/lib/listing"
import { getAllMessages, getLatestMessageDate, getMessageCounts } from "@/lib/messages"
import { getItemListJsonLd, getSiteJsonLd } from "@/lib/seo"

export default function IndexPage() {
  const counts = getMessageCounts()
  // Mirrors the rows the table renders server-side, so the ItemList describes
  // what is actually in the HTML rather than a separate selection.
  const visible = toListingItems(getAllMessages().slice(0, SERVER_ROWS), {
    summaries: false,
  })

  return (
    <main className="page-shell">
      <JsonLd
        data={getSiteJsonLd({
          itemCount: counts.total,
          modified: getLatestMessageDate(),
        })}
      />
      <JsonLd
        data={getItemListJsonLd(
          visible.map((item) => ({
            name: `${item.id} - ${item.title}`,
            path: item.href,
          }))
        )}
      />
      <section className="page-intro">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="page-title text-transparent bg-clip-text bg-linear-to-br from-foreground to-foreground/70">
            {siteConfig.name}
          </h1>
          <p className="page-description">
            A fast, searchable archive of{" "}
            {counts.total.toLocaleString("en-US")} Microsoft 365 Message Center
            announcements and Roadmap items. Track tenant-relevant changes,
            rollout dates, and service updates — with the full revision history
            of every message.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/service"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Layers size={15} />
            Browse by service
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Milestone size={15} />
            Roadmap
          </Link>
          <Link
            href="/archive"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Archive size={15} />
            Archive
          </Link>
          <Link
            href="/about"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Info size={15} />
            About
          </Link>
          <a
            href="/rss.xml"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Rss size={15} />
            RSS
          </a>
        </div>
      </section>

      <section>
        <h2 className="sr-only">
          All Microsoft 365 Message Center and Roadmap announcements
        </h2>
        <MessagesTable />
      </section>
    </main>
  )
}
