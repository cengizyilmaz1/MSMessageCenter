import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  browseSections,
  getBrowseItems,
  getBrowsePageCount,
  getBrowsePath,
} from "@/lib/browse"
import { getAllServices, getMessageCounts } from "@/lib/messages"
import { getBreadcrumbJsonLd, getCollectionPageJsonLd } from "@/lib/seo"
import { slugifyService } from "@/lib/slugs.mjs"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"

const title = "Browse the archive"
const description =
  "Complete index of every Microsoft 365 Message Center announcement, Roadmap item, expired message, and service in the archive."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/browse" },
  openGraph: {
    title: `${title} | ${siteConfig.name}`,
    description,
    url: "/browse",
    images: ["/og-default.png"],
  },
}

export default function BrowsePage() {
  const counts = getMessageCounts()
  const services = getAllServices()

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: "/browse",
          name: title,
          description,
          itemCount: counts.total,
        })}
      />
      <JsonLd data={getBreadcrumbJsonLd([{ label: "Browse" }])} />

      <Breadcrumb items={[{ label: "Browse" }]} />

      <section className="page-intro">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="page-title">{title}</h1>
          <p className="page-description">
            {description} Every entry below links directly to a full detail page
            — no JavaScript required.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {browseSections.map((section) => {
          const total = getBrowseItems(section.slug).length
          const pageCount = getBrowsePageCount(section.slug)

          return (
            <article
              key={section.slug}
              className="rounded-lg border p-4 transition-colors hover:bg-accent/40"
            >
              <h2 className="text-base font-semibold">
                <Link
                  href={getBrowsePath(section.slug, 1)}
                  className="underline-offset-4 hover:underline"
                >
                  {section.title}
                </Link>
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {section.description}
              </p>
              <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                {total.toLocaleString("en-US")} entries across {pageCount} pages
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(
                  { length: Math.min(pageCount, 12) },
                  (_, index) => index + 1
                ).map((page) => (
                  <Link
                    key={page}
                    href={getBrowsePath(section.slug, page)}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded border px-1.5 text-xs tabular-nums hover:bg-accent"
                  >
                    {page}
                  </Link>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          <Link href="/service" className="underline-offset-4 hover:underline">
            Browse by service
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {services.length.toLocaleString("en-US")} Microsoft 365 services and
          workloads referenced in the archive.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {services.map((service) => (
            <li key={service}>
              <Link
                href={`/service/${slugifyService(service)}`}
                className="inline-flex items-center rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-accent"
              >
                {service}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
