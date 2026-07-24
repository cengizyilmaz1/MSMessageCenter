import { Metadata } from "next"
import { notFound } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { siteConfig } from "@/config/site"
import {
  getAllRoadmapStaticParams,
  getMessageData,
  getMessageSource,
  getMessageSourceLabel,
} from "@/lib/messages"
import { getCanonicalMessagePath } from "@/lib/slugs.mjs"
import { MessageSource } from "@/types/message"
import MessageDetail from "@/components/message/message-detail"
import MessageMetadata from "@/components/message/message-metadata"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import {
  absoluteUrl,
  getBreadcrumbJsonLd,
  getMessageJsonLd,
  getMessageSeoDescription,
  getMessageSeoTitle,
} from "@/lib/seo"

type Props = {
  params: Promise<{ id: string }>
}

export const dynamicParams = false

export default async function Page({ params }: Props) {
  const { id } = await params

  const msg = getMessageData(id)
  if (!msg) notFound()

  const source = getMessageSource(msg)
  const sourceLabel = getMessageSourceLabel(msg)

  if (source !== MessageSource.Roadmap) notFound()

  const breadcrumbItems = [
    { label: "Roadmap", href: "/roadmap" },
    { label: msg.Id },
  ]

  return (
    <>
      <JsonLd data={getMessageJsonLd(msg)} />
      <JsonLd data={getBreadcrumbJsonLd(breadcrumbItems)} />
      <main className="page-shell min-w-0">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex flex-col gap-3 border-b border-border/50 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400">
              {sourceLabel}
            </span>
            {msg.IsMajorChange && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
                <AlertTriangle size={10} />
                Major change
              </span>
            )}
          </div>
          <h1 className="max-w-4xl break-words text-2xl font-bold leading-snug text-foreground md:text-[1.85rem]">
            <span className="mr-2 font-mono text-lg font-semibold text-violet-500 dark:text-violet-400">
              {msg.Id}
            </span>
            {msg.Title}
          </h1>
        </div>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="min-w-0">
            <MessageDetail id={msg.Id} />
          </div>

          <aside className="w-full lg:sticky lg:top-[4.5rem]">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <MessageMetadata id={msg.Id} layout="stack" showHistoryLink />
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const msg = getMessageData(id)
  const title = getMessageSeoTitle(msg, id)
  const description = getMessageSeoDescription(msg)
  const url = msg ? getCanonicalMessagePath(msg) : `/roadmap/${id}`
  const sourceLabel = getMessageSourceLabel(msg)
  const tags = [...(msg?.Services || []), ...(msg?.Tags || [])].filter(Boolean)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url: absoluteUrl(url),
      siteName: siteConfig.name,
      title,
      description,
      publishedTime: msg?.StartDateTime,
      modifiedTime: msg?.LastModifiedDateTime,
      section: sourceLabel,
      tags,
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-default.png"],
    },
  }
}

export async function generateStaticParams() {
  return getAllRoadmapStaticParams()
}
