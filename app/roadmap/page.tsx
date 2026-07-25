import { Metadata } from "next"
import Link from "next/link"

import { Milestone } from "lucide-react"

import MessagesTable from "@/components/table/messages-table"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { siteConfig } from "@/config/site"
import { MessageSource } from "@/types/message"
import { getListingItems } from "@/lib/listing"
import { getMessagesBySource } from "@/lib/messages"
import {
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  getItemListJsonLd,
} from "@/lib/seo"

const description =
  "Microsoft 365 Roadmap items indexed alongside Message Center announcements, with rollout timelines and revision history."

export const metadata: Metadata = {
  title: "Microsoft 365 Roadmap",
  description,
  alternates: {
    canonical: "/roadmap",
  },
  openGraph: {
    title: `Microsoft 365 Roadmap | ${siteConfig.name}`,
    description,
    url: "/roadmap",
    images: ["/og-default.png"],
  },
}

export default function RoadmapPage() {
  const messages = getMessagesBySource(MessageSource.Roadmap)
  const latest = getListingItems("roadmap").slice(0, 20)

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: "/roadmap",
          name: "Microsoft 365 Roadmap",
          description,
          itemCount: messages.length,
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
      <JsonLd data={getBreadcrumbJsonLd([{ label: "Roadmap" }])} />

      <Breadcrumb items={[{ label: "Roadmap" }]} />
      <section className="page-intro">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Milestone size={36} className="text-primary" />
            <h1 className="page-title text-transparent bg-clip-text bg-linear-to-br from-foreground to-foreground/70">
              Microsoft 365 Roadmap
            </h1>
          </div>
          <p className="page-description">
            {messages.length.toLocaleString("en-US")} Roadmap records normalized
            into the same searchable archive as Message Center posts.
          </p>
        </div>
      </section>

      <MessagesTable
        messages={messages}
        scope="roadmap"
        initialSourceFilter="roadmap"
      />

      <div className="mt-8">
        <Link
          href="/service"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          Browse Roadmap items by service
        </Link>
      </div>
    </main>
  )
}

