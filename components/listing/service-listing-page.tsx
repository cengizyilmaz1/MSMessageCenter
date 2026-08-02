import Link from "next/link"
import { notFound } from "next/navigation"

import { getServiceListing, groupByYear } from "@/lib/listing"
import {
  getPageCount,
  getPageSlice,
  getPerPage,
  getServicePagePath,
} from "@/lib/pagination.mjs"
import {
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  getItemListJsonLd,
  getServicePageSeo,
} from "@/lib/seo"
import { slugifyService } from "@/lib/slugs.mjs"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { MessageIndex } from "@/components/listing/message-index"
import { Pagination } from "@/components/listing/pagination"
import { getServiceIcon } from "@/components/message/message-icons"
import { JsonLd } from "@/components/seo/json-ld"

/**
 * A service hub, or one page of it.
 *
 * Service pages are the crawl path to the detail pages, so the union of all
 * pages must still contain every record as a real anchor — nothing here may be
 * truncated or hidden behind client-side interaction. Pagination only decides
 * how that set is divided; see lib/pagination.mjs.
 */
export function ServiceListingPage({
  service,
  page,
}: {
  service: string
  page: number
}) {
  const serviceSlug = slugifyService(service)
  const listing = getServiceListing(service)
  const total = listing.length
  const pageCount = getPageCount(total)

  if (page < 1 || page > pageCount) notFound()

  const items = getPageSlice(listing, page)
  const groups = groupByYear(items)
  const seo = getServicePageSeo({
    service,
    serviceSlug,
    page,
    pageCount,
    total,
  })
  const ServiceIcon = getServiceIcon(service)

  // Positions continue across pages so the lists describe one ordered series
  // rather than restarting at 1 on every page.
  const startPosition = (page - 1) * getPerPage(total) + 1
  const sample = items.slice(0, 20)

  const breadcrumbItems = [
    { label: "Services", href: "/service" },
    ...(pageCount > 1
      ? [
          { label: service, href: getServicePagePath(serviceSlug, 1) },
          { label: `Page ${page}` },
        ]
      : [{ label: service }]),
  ]

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: seo.canonical,
          name: seo.title,
          description: seo.description,
          itemCount: items.length,
        })}
      />
      {sample.length ? (
        <JsonLd
          data={getItemListJsonLd(
            sample.map((item) => ({
              name: `${item.id} - ${item.title}`,
              path: item.href,
            })),
            { startPosition }
          )}
        />
      ) : null}
      <JsonLd data={getBreadcrumbJsonLd(breadcrumbItems)} />

      <Breadcrumb items={breadcrumbItems} />
      <section className="page-intro">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ServiceIcon size={36} className="text-primary" />
            <h1 className="page-title text-transparent bg-clip-text bg-linear-to-br from-foreground to-foreground/70">
              {service}
            </h1>
          </div>
          <p className="page-description">
            {total.toLocaleString("en-US")} Message Center and Roadmap
            announcements for this Microsoft 365 service
            {pageCount > 1 ? `, shown ${getPerPage(total)} at a time` : ""}.
          </p>
        </div>
      </section>

      {items.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            {pageCount > 1
              ? `${service} updates - page ${page} of ${pageCount}`
              : `All ${service} updates`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageCount > 1
              ? `Announcements ${startPosition.toLocaleString("en-US")}-${(startPosition + items.length - 1).toLocaleString("en-US")} of ${total.toLocaleString("en-US")}, newest first.`
              : "Every Message Center announcement and Roadmap item recorded for this service, newest first."}
          </p>
          <div className="mt-6">
            <MessageIndex groups={groups} />
          </div>

          <Pagination
            currentPage={page}
            pageCount={pageCount}
            hrefFor={(target) => getServicePagePath(serviceSlug, target)}
            label={`${service} updates pages`}
          />

          <Link
            href="/service"
            className="mt-8 inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            All Microsoft 365 services
          </Link>
        </section>
      ) : null}
    </main>
  )
}
