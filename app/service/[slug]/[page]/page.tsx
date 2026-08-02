import { Metadata } from "next"
import { notFound } from "next/navigation"

import { siteConfig } from "@/config/site"
import { findServiceBySlug } from "@/lib/filters"
import { getServiceListing } from "@/lib/listing"
import { getAllServices } from "@/lib/messages"
import { getPageCount, getPageNumbers } from "@/lib/pagination.mjs"
import { getServicePageSeo } from "@/lib/seo"
import { slugifyService } from "@/lib/slugs.mjs"
import { ServiceListingPage } from "@/components/listing/service-listing-page"

type Props = {
  params: Promise<{ slug: string; page: string }>
}

export const dynamicParams = false

/**
 * Pages 2..N only. Page 1 is the service hub at /service/{slug}; generating a
 * /service/{slug}/1 as well would publish the same listing at two URLs.
 */
export function generateStaticParams() {
  return getAllServices().flatMap((service) => {
    const slug = slugifyService(service)
    return getPageNumbers(getServiceListing(service).length)
      .filter((page) => page > 1)
      .map((page) => ({ slug, page: String(page) }))
  })
}

/** Rejects `01`, `2.0`, `-1` and anything else that is not a plain page number. */
function parsePage(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null
  return Number(value)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page: pageParam } = await params
  const service = findServiceBySlug(slug, getAllServices())
  const page = parsePage(pageParam)

  if (!service || page === null) {
    return { title: "Not Found" }
  }

  const total = getServiceListing(service).length
  const seo = getServicePageSeo({
    service,
    serviceSlug: slugifyService(service),
    page,
    pageCount: getPageCount(total),
    total,
  })

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonical,
    },
    openGraph: {
      title: `${seo.title} | ${siteConfig.name}`,
      description: seo.description,
      url: seo.canonical,
      images: ["/og-default.png"],
    },
  }
}

export default async function ServicePaginationPage({ params }: Props) {
  const { slug, page: pageParam } = await params
  const service = findServiceBySlug(slug, getAllServices())
  const page = parsePage(pageParam)

  if (!service || page === null || page < 2) notFound()

  return <ServiceListingPage service={service} page={page} />
}
