import { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"

import {
  getComparableMessageParams,
  getMessageData,
  getMessageHistory,
} from "@/lib/messages"
import {
  getCanonicalMessagePath,
  parseMessageIdFromSlug,
} from "@/lib/slugs.mjs"
import { CompareHistoryClient } from "@/components/message/history-page-client"
import { MessageSource } from "@/types/message"

type Props = {
  params: Promise<{ id: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  // One shell per message with a comparable history. The specific from/to pair
  // is read client-side from the query string (?from=..&to=..), so we no longer
  // pre-generate the combinatorial N×N pairs.
  return getComparableMessageParams(MessageSource.MessageCenter)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const message = getMessageData(id)
  const canonicalPath = message ? getCanonicalMessagePath(message) : `/message/${id}`
  return {
    title: `${message?.Id ?? parseMessageIdFromSlug(id)} - version comparison`,
    robots: { index: false, follow: true },
    alternates: { canonical: canonicalPath },
  }
}

export default async function ComparePage({ params }: Props) {
  const { id } = await params
  const messageId = parseMessageIdFromSlug(id)
  const message = getMessageData(messageId)
  const history = getMessageHistory(messageId)
  if (!history || history.versions.length < 2) notFound()

  const basePath = message ? getCanonicalMessagePath(message) : `/message/${id}`

  return (
    <main className="page-shell min-w-0">
      <Suspense>
        <CompareHistoryClient basePath={basePath} messageId={messageId} />
      </Suspense>
    </main>
  )
}
