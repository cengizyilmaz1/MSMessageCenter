import { Metadata } from "next"
import { notFound } from "next/navigation"

import { siteConfig } from "@/config/site"
import {
  getBrowsePage,
  getBrowsePageCount,
  getBrowsePath,
  getBrowseSection,
  getBrowseStaticParams,
} from "@/lib/browse"
import {
  getBreadcrumbJsonLd,
  getItemListJsonLd,
} from "@/lib/seo"
import { BrowseList } from "@/components/browse/browse-list"
import { Pagination } from "@/components/browse/pagination"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"

type Props = {
  params: Promise<{ section: string; page: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getBrowseStaticParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: sectionSlug, page } = await params
  const section = getBrowseSection(sectionSlug)
  if (!section) return { title: "Not Found" }

  const pageNumber = Number(page)
  const pageCount = getBrowsePageCount(sectionSlug)
  const suffix = pageNumber > 1 ? ` — page ${pageNumber} of ${pageCount}` : ""
  const title = `${section.title}${suffix}`
  const description = `${section.description}${
    pageNumber > 1 ? ` Page ${pageNumber} of ${pageCount}.` : ""
  }`

  return {
    title,
    description,
    alternates: { canonical: getBrowsePath(sectionSlug, pageNumber) },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: getBrowsePath(sectionSlug, pageNumber),
      images: ["/og-default.png"],
    },
  }
}

export default async function BrowseSectionPage({ params }: Props) {
  const { section: sectionSlug, page } = await params
  const section = getBrowseSection(sectionSlug)
  if (!section) notFound()

  const pageNumber = Number(page)
  const pageCount = getBrowsePageCount(sectionSlug)
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
    notFound()
  }

  const items = getBrowsePage(sectionSlug, pageNumber)

  return (
    <main className="page-shell">
      <JsonLd
        data={getItemListJsonLd(
          items.map((item) => ({ name: `${item.id} - ${item.title}`, path: item.href })),
          { startPosition: (pageNumber - 1) * items.length + 1 }
        )}
      />
      <JsonLd
        data={getBreadcrumbJsonLd([
          { label: "Browse", href: "/browse" },
          { label: section.title },
        ])}
      />

      <Breadcrumb
        items={[{ label: "Browse", href: "/browse" }, { label: section.title }]}
      />

      <section className="page-intro">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="page-title">{section.heading}</h1>
          <p className="page-description">
            {section.description}
            {pageCount > 1 ? ` Page ${pageNumber} of ${pageCount}.` : ""}
          </p>
        </div>
      </section>

      <section>
        <BrowseList items={items} />
        <Pagination
          currentPage={pageNumber}
          pageCount={pageCount}
          buildHref={(target) => getBrowsePath(sectionSlug, target)}
        />
      </section>
    </main>
  )
}
