import { Metadata } from "next"
import Link from "next/link"

import { Archive } from "lucide-react"

import MessagesTable from "@/components/table/messages-table"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { siteConfig } from "@/config/site"
import { getListingItems } from "@/lib/listing"
import { getArchiveMessages } from "@/lib/messages"
import {
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  getItemListJsonLd,
} from "@/lib/seo"

const description =
  "Expired Microsoft 365 Message Center announcements preserved for reference, with stable citable URLs and full revision history."

export const metadata: Metadata = {
  title: "Archive",
  description,
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    title: `Archive | ${siteConfig.name}`,
    description,
    url: "/archive",
    images: ["/og-default.png"],
  },
}

export default function ArchivePage() {
  const archiveMessages = getArchiveMessages()
  const latest = getListingItems("archive").slice(0, 20)

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: "/archive",
          name: "Expired Message Center archive",
          description,
          itemCount: archiveMessages.length,
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
      <JsonLd data={getBreadcrumbJsonLd([{ label: "Archive" }])} />

      <Breadcrumb items={[{ label: "Archive" }]} />
      <section className="page-intro">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Archive size={36} className="text-primary" />
            <h1 className="page-title text-transparent bg-clip-text bg-linear-to-br from-foreground to-foreground/70">
              Expired Message Center archive
            </h1>
          </div>
          <p className="page-description">
            {archiveMessages.length.toLocaleString("en-US")} historical Message
            Center posts that are no longer active in the live feed, kept with
            stable detail pages for reference and citation.
          </p>
        </div>
      </section>

      <MessagesTable
        messages={[]}
        archiveMessages={archiveMessages}
        scope="archive"
        initialSourceFilter="messageCenter"
      />

      <div className="mt-8">
        <Link
          href="/service"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          Browse expired announcements by service
        </Link>
      </div>
    </main>
  )
}

