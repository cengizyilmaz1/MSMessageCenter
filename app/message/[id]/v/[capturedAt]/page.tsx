import { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getAllVersionParams,
  getMessageData,
  getMessageVersion,
} from "@/lib/messages"
import {
  getCanonicalMessagePath,
  parseMessageIdFromSlug,
} from "@/lib/slugs.mjs"
import { VersionHistoryClient } from "@/components/message/history-page-client"
import { MessageSource } from "@/types/message"

type Props = {
  params: Promise<{ id: string; capturedAt: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  return getAllVersionParams(MessageSource.MessageCenter)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, capturedAt } = await params
  const message = getMessageData(id)
  const canonicalPath = message ? getCanonicalMessagePath(message) : `/message/${id}`
  return {
    title: `${message?.Id ?? parseMessageIdFromSlug(id)} - historical version`,
    robots: { index: false, follow: true },
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${message?.Id ?? parseMessageIdFromSlug(id)} - historical version`,
      url: `${canonicalPath}/v/${capturedAt}`,
    },
  }
}

export default async function VersionPage({ params }: Props) {
  const { id, capturedAt } = await params
  const messageId = parseMessageIdFromSlug(id)
  const message = getMessageData(messageId)
  const version = getMessageVersion(messageId, capturedAt)
  if (!version) notFound()

  const basePath = message ? getCanonicalMessagePath(message) : `/message/${id}`

  return (
    <main className="page-shell min-w-0">
      <VersionHistoryClient
        basePath={basePath}
        capturedAt={capturedAt}
        messageId={messageId}
      />
    </main>
  )
}
