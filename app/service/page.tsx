import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  getAllServices,
  getArchiveMessages,
  getMessagesByService,
} from "@/lib/messages"
import { getBreadcrumbJsonLd, getCollectionPageJsonLd } from "@/lib/seo"
import { slugifyService } from "@/lib/slugs.mjs"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"

const title = "Microsoft 365 services"
const description =
  "Every Microsoft 365 service and workload referenced in the Message Center and Roadmap archive, with a dedicated update feed for each."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/service" },
  openGraph: {
    title: `${title} | ${siteConfig.name}`,
    description,
    url: "/service",
    images: ["/og-default.png"],
  },
}

export default function ServiceIndexPage() {
  const services = getAllServices()
  const archive = getArchiveMessages()

  const entries = services
    .map((service) => {
      const slug = slugifyService(service)
      const active = getMessagesByService(service).length
      const archived = archive.filter((item) =>
        item.Services?.some((s) => slugifyService(s) === slug)
      ).length

      return { service, slug, total: active + archived }
    })
    .filter((entry) => entry.total > 0)

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: "/service",
          name: title,
          description,
          itemCount: entries.length,
        })}
      />
      <JsonLd data={getBreadcrumbJsonLd([{ label: "Services" }])} />

      <Breadcrumb items={[{ label: "Services" }]} />

      <section className="page-intro">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
      </section>

      <section>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/service/${entry.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {entry.service}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {entry.total.toLocaleString("en-US")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
