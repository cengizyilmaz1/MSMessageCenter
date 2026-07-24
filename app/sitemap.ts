import { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { getBrowsePath, getBrowseStaticParams } from "@/lib/browse"
import {
  getAllMessageStaticParams,
  getAllRoadmapStaticParams,
  getAllServices,
  getLatestMessageDate,
  getMessageData,
} from "@/lib/messages"
import { getCanonicalMessagePath, slugifyService } from "@/lib/slugs.mjs"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  // Use the newest data timestamp as a stable site-wide lastmod instead of
  // `new Date()`, so the sitemap is deterministic (reproducible builds, no
  // "everything changed today" noise for crawlers).
  const latest = getLatestMessageDate()
  const siteLastModified = latest ? new Date(latest) : undefined

  const home = {
    url: siteConfig.url,
    lastModified: siteLastModified,
    changeFrequency: "daily" as const,
    priority: 1,
  }

  const messages = getAllMessageStaticParams().map(({ id }) => {
    const msg = getMessageData(id)
    const lastModified = msg?.LastModifiedDateTime || msg?.StartDateTime

    return {
      url: `${siteConfig.url}${msg ? getCanonicalMessagePath(msg) : `/message/${id}`}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }
  })

  const roadmapItems = getAllRoadmapStaticParams().map(({ id }) => {
    const msg = getMessageData(id)
    const lastModified = msg?.LastModifiedDateTime || msg?.StartDateTime

    return {
      url: `${siteConfig.url}${msg ? getCanonicalMessagePath(msg) : `/roadmap/${id}`}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }
  })

  const staticPages = ["/browse", "/roadmap", "/archive", "/service", "/about"].map(
    (path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: siteLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  )

  // The paginated browse indexes are the crawl path to every detail page, so
  // they need to be in the sitemap too.
  const browsePages = getBrowseStaticParams().map(({ section, page }) => ({
    url: `${siteConfig.url}${getBrowsePath(section, Number(page))}`,
    lastModified: siteLastModified,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  const services = getAllServices().map((service) => ({
    url: `${siteConfig.url}/service/${slugifyService(service)}`,
    lastModified: siteLastModified,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }))

  return [
    home,
    ...staticPages,
    ...browsePages,
    ...services,
    ...messages,
    ...roadmapItems,
  ]
}
