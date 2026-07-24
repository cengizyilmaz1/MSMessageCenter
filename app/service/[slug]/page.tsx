import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import MessagesTable from "@/components/table/messages-table"
import { BrowseList } from "@/components/browse/browse-list"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { siteConfig } from "@/config/site"
import {
  getAllServices,
  getArchiveMessages,
  getFormattedDate,
  getMessageDescription,
  getMessagesByService,
  getMessageSourceLabel,
} from "@/lib/messages"
import {
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  getItemListJsonLd,
} from "@/lib/seo"
import { findServiceBySlug } from "@/lib/filters"
import { getCanonicalMessagePath, slugifyService } from "@/lib/slugs.mjs"
import { getServiceIcon } from "@/components/message/message-icons"

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getAllServices().map((service) => ({
    slug: slugifyService(service),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = findServiceBySlug(slug, getAllServices())
  
  if (!service) {
    return { title: "Not Found" }
  }

  return {
    title: `${service} updates`,
    description: `Microsoft 365 Message Center and Roadmap updates for ${service}.`,
    alternates: {
      canonical: `/service/${slugifyService(service)}`,
    },
    openGraph: {
      title: `${service} updates | ${siteConfig.name}`,
      description: `Microsoft 365 Message Center and Roadmap updates for ${service}.`,
      url: `/service/${slugifyService(service)}`,
      images: ["/og-default.png"],
    },
  }
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = findServiceBySlug(slug, getAllServices())
  
  if (!service) notFound()
  const messages = getMessagesByService(service)
  const serviceSlug = slugifyService(service)
  const archiveMessages = getArchiveMessages().filter((item) =>
    item.Services?.some((s) => slugifyService(s) === serviceSlug)
  )

  if (messages.length === 0 && archiveMessages.length === 0) notFound()

  const ServiceIcon = getServiceIcon(service)
  const total = messages.length + archiveMessages.length
  const description = `Microsoft 365 Message Center and Roadmap updates for ${service}.`

  const latest = messages.slice(0, 20).map((item) => ({
    id: item.Id,
    title: item.Title,
    href: getCanonicalMessagePath(item),
    services: item.Services ?? [],
    published: getFormattedDate(item.StartDateTime),
    lastUpdated: getFormattedDate(item.LastModifiedDateTime),
    summary: getMessageDescription(item),
    sourceLabel: getMessageSourceLabel(item),
    isMajor: item.IsMajorChange ?? false,
  }))

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: `/service/${serviceSlug}`,
          name: `${service} updates`,
          description,
          itemCount: total,
        })}
      />
      {latest.length ? (
        <JsonLd
          data={getItemListJsonLd(
            latest.map((item) => ({
              name: `${item.id} - ${item.title}`,
              path: item.href,
            }))
          )}
        />
      ) : null}
      <JsonLd
        data={getBreadcrumbJsonLd([
          { label: "Services", href: "/service" },
          { label: service },
        ])}
      />

      <Breadcrumb
        items={[{ label: "Services", href: "/service" }, { label: service }]}
      />
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
            announcements for this Microsoft 365 service.
          </p>
        </div>
      </section>

      <MessagesTable
        messages={messages}
        archiveMessages={archiveMessages}
        includeArchiveFetch={false}
      />

      {latest.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Latest {service} updates</h2>
          <div className="mt-4">
            <BrowseList items={latest} />
          </div>
          <Link
            href="/service"
            className="mt-4 inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            All Microsoft 365 services
          </Link>
        </section>
      ) : null}
    </main>
  )
}

