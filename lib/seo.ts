import { siteConfig } from "@/config/site"
import { Message } from "@/types/message"
import {
  getMessageDescription,
  getMessageSourceLabel,
  getMessageSummary,
  stripHtml,
} from "@/lib/messages"
import { getCanonicalMessagePath } from "@/lib/slugs.mjs"

const ORGANIZATION_ID = `${siteConfig.parentUrl}/#organization`
const WEBSITE_ID = `${siteConfig.url}/#website`
const DATASET_ID = `${siteConfig.url}/#dataset`

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`
}

export function getMessageSeoTitle(message: Message | undefined, id: string) {
  return message ? `${message.Id} - ${message.Title}` : id
}

export function getMessageSeoDescription(message: Message | undefined) {
  return getMessageDescription(message) || siteConfig.description
}

function toThing(name: string) {
  return { "@type": "Thing", name: name.trim() }
}

/**
 * TechArticle fits product change announcements better than the generic Article
 * type and is what search and answer engines expect for technical
 * documentation.
 */
export function getMessageJsonLd(message: Message) {
  const url = absoluteUrl(getCanonicalMessagePath(message))
  const keywords = [...(message.Services ?? []), ...(message.Tags ?? [])].filter(
    Boolean
  )
  const body = stripHtml(
    getMessageSummary(message) || message.Body?.Markdown || message.Body?.Content
  )

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: `${message.Id} - ${message.Title}`,
    name: message.Title,
    description: getMessageSeoDescription(message),
    image: absoluteUrl("/og-default.png"),
    datePublished: message.StartDateTime,
    dateModified: message.LastModifiedDateTime || message.StartDateTime,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "en-US",
    isAccessibleForFree: true,
    articleSection: getMessageSourceLabel(message),
    identifier: message.Id,
    ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
    ...(body ? { articleBody: body } : {}),
    ...(message.Services?.length ? { about: message.Services.map(toThing) } : {}),
    author: {
      "@type": "Person",
      name: siteConfig.owner,
      url: siteConfig.parentUrl,
    },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": DATASET_ID },
  }
}

/**
 * Emitted on listing pages so crawlers and answer engines get an explicit,
 * ordered manifest of the detail URLs present on the page.
 */
export function getItemListJsonLd(
  items: { name: string; path: string }[],
  { startPosition = 1 }: { startPosition?: number } = {}
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: startPosition + index,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  }
}

export function getCollectionPageJsonLd({
  path,
  name,
  description,
  itemCount,
}: {
  path: string
  name: string
  description: string
  itemCount?: number
}) {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": DATASET_ID },
    ...(itemCount
      ? { mainEntity: { "@type": "ItemList", numberOfItems: itemCount } }
      : {}),
  }
}

export function getFaqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }
}

export function getBreadcrumbJsonLd(
  items: { label: string; href?: string }[]
) {
  const entries = [{ label: "Home", href: "/" }, ...items]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.label,
      ...(entry.href ? { item: absoluteUrl(entry.href) } : {}),
    })),
  }
}

/**
 * Site-wide graph. The Dataset node is deliberate: it describes the archive as
 * a citable, machine-readable corpus with real distribution URLs, which is what
 * Google Dataset Search and LLM answer engines look for.
 */
export function getSiteJsonLd({
  itemCount,
  modified,
}: { itemCount?: number; modified?: string } = {}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: absoluteUrl("/"),
        name: siteConfig.name,
        alternateName: "M365 Message Center Archive",
        description: siteConfig.description,
        inLanguage: "en-US",
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "Dataset",
        "@id": DATASET_ID,
        name: siteConfig.name,
        description:
          "Structured archive of Microsoft 365 Message Center announcements and Microsoft 365 Roadmap items, including full version history for every entry.",
        url: absoluteUrl("/"),
        isAccessibleForFree: true,
        inLanguage: "en-US",
        creator: { "@id": ORGANIZATION_ID },
        keywords: [
          "Microsoft 365",
          "Message Center",
          "Microsoft 365 Roadmap",
          "tenant administration",
          "change management",
        ],
        ...(itemCount ? { size: `${itemCount} records` } : {}),
        ...(modified ? { dateModified: modified } : {}),
        distribution: [
          {
            "@type": "DataDownload",
            name: "Full message index (JSON)",
            encodingFormat: "application/json",
            contentUrl: absoluteUrl("/messages-index.json"),
          },
          {
            "@type": "DataDownload",
            name: "Archive index (JSON)",
            encodingFormat: "application/json",
            contentUrl: absoluteUrl("/messages-archive.json"),
          },
          {
            "@type": "DataDownload",
            name: "Latest updates (RSS)",
            encodingFormat: "application/rss+xml",
            contentUrl: absoluteUrl("/rss.xml"),
          },
        ],
      },
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: siteConfig.owner,
        url: siteConfig.parentUrl,
        logo: absoluteUrl("/og-default.png"),
        sameAs: [
          siteConfig.links.twitter,
          siteConfig.links.linkedin,
          siteConfig.links.github,
        ],
      },
    ],
  }
}
