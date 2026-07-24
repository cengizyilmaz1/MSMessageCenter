import { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
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

  const staticPages = ["/service", "/roadmap", "/archive", "/about"].map(
    (path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: siteLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  )

  // Service pages carry the full set of records for their service, so they are
  // the crawl path to every detail page and rank above the other hubs.
  const services = getAllServices().map((service) => ({
    url: `${siteConfig.url}/service/${slugifyService(service)}`,
    lastModified: siteLastModified,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  return [
    home,
    ...staticPages,
    ...services,
    ...messages,
    ...roadmapItems,
  ]
}
