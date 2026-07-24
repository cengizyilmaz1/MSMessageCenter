import Link from "next/link"
import { Archive, Info, Layers, Milestone, Rss } from "lucide-react"

import MessagesTable from "@/components/table/messages-table"
import { siteConfig } from "@/config/site"
import { JsonLd } from "@/components/seo/json-ld"
import { BrowseList } from "@/components/browse/browse-list"
import { browseSections, getBrowseItems, getBrowsePath } from "@/lib/browse"
import { getLatestMessageDate, getMessageCounts } from "@/lib/messages"
import { getItemListJsonLd, getSiteJsonLd } from "@/lib/seo"

export default function IndexPage() {
  const counts = getMessageCounts()
  const latest = getBrowseItems("message-center").slice(0, 20)

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
          latest.map((item) => ({
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
            href="/browse"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Layers size={15} />
            Browse all
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
        <MessagesTable />
      </section>

      {/*
        The table above is client-rendered and paginated in the browser, so its
        links do not exist in the served HTML beyond the first slice. This
        section gives crawlers a real, no-JavaScript path into the newest
        content and on into the full paginated indexes.
      */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Latest Message Center announcements</h2>
        <div className="mt-4">
          <BrowseList items={latest} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {browseSections.map((section) => (
            <Link
              key={section.slug}
              href={getBrowsePath(section.slug, 1)}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              {section.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
