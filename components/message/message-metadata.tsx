import Link from "next/link"
import type React from "react"
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  History,
  Link2,
  Layers,
} from "lucide-react"

import { Message, MessageSource } from "@/types/message"
import MessageDateTimeTable from "@/components/message/message-date-time-table"
import {
  getFormattedDate,
  getMessageData,
  getMessageDetailValue,
  getMessagePlatforms,
  getMessageRoadmapID,
  getMessageReferencedBy,
  getMessageReferences,
  getMessageSource,
  getMessageSourceLabel,
  getSimilarMessages,
  hasMultipleVersions,
} from "@/lib/messages"
import { formatCategoryLabel } from "@/lib/filters"
import { getCanonicalMessagePath, slugifyService } from "@/lib/slugs.mjs"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/ui/copy-button"

export function ExpiredBanner(props: { id: string }) {
  const msg = getMessageData(props.id)
  const source = getMessageSource(msg)
  const isRoadmap = source === MessageSource.Roadmap
  const isExpired =
    !isRoadmap && msg?.EndDateTime
      ? new Date(msg.EndDateTime) < new Date()
      : false
  if (!isExpired) return null
  const dateExpired = getFormattedDate(msg?.EndDateTime)
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200">
      <CalendarClock size={15} className="shrink-0" />
      <span>
        This announcement expired on <strong>{dateExpired}</strong> and is no
        longer active in Message Center.
      </span>
    </div>
  )
}

type InfoCardsLayout = "grid" | "stack"

function BadgeList({
  values,
  variant = "secondary",
  hrefFor,
}: {
  values: string[]
  variant?: "default" | "secondary" | "destructive" | "outline"
  hrefFor?: (value: string) => string
}) {
  if (!values.length) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) =>
        hrefFor ? (
          <Link key={value} href={hrefFor(value)}>
            <Badge variant={variant} className="font-normal text-xs px-1.5 py-0.5 transition-colors hover:bg-muted">
              {value}
            </Badge>
          </Link>
        ) : (
          <Badge key={value} variant={variant} className="font-normal text-xs px-1.5 py-0.5">
            {value}
          </Badge>
        )
      )}
    </div>
  )
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 border-b border-border/60 py-2.5 last:border-0 items-start">
      <span className="text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export default function MessageMetadata(props: {
  id: string
  layout?: InfoCardsLayout
  showHistoryLink?: boolean
  message?: Message
}) {
  const showHistoryLink = props.showHistoryLink ?? false
  const msg = props.message ?? getMessageData(props.id)
  const source = getMessageSource(msg)
  const isRoadmap = source === MessageSource.Roadmap
  const sourceLabel = getMessageSourceLabel(msg)
  const sourceId = getMessageDetailValue(msg, "SourceId") || msg?.Id || props.id
  const category = msg?.Category
  const services = msg?.Services ?? []
  const tags = msg?.Tags ?? []
  const status = getMessageDetailValue(msg, "Status")
  const releasePhase = getMessageDetailValue(msg, "ReleasePhase")
  const clouds = getMessageDetailValue(msg, "CloudInstances")
  const platforms = getMessagePlatforms(msg)
  const roadmapId = getMessageRoadmapID(msg)
  const hasHistory = hasMultipleVersions(props.id)
  const similarMessages = getSimilarMessages(props.id)
  const referenceIds = Array.from(
    new Set([
      ...getMessageReferences(props.id),
      ...getMessageReferencedBy(props.id),
    ])
  )

  const externalRoadmapLink =
    getMessageDetailValue(msg, "RoadmapLink") ||
    `https://www.microsoft.com/en-US/microsoft-365/roadmap?filters=&searchterms=${roadmapId}`
  // RoadmapIds can be comma-separated (e.g. "502520,560321"); take the first so
  // the internal link resolves (RM502520) instead of building an invalid id.
  const firstRoadmapId = roadmapId.split(",")[0].trim()
  const internalRoadmapId = firstRoadmapId ? `RM${firstRoadmapId}` : ""
  const internalRoadmapMessage = internalRoadmapId
    ? getMessageData(internalRoadmapId)
    : undefined

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h2>
      </div>

      {/* Metadata rows */}
      <div className="px-4 py-1">
        <MetadataRow label="ID">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[13px] font-medium">{sourceId}</span>
            <CopyButton value={sourceId} label={`Copy ${sourceId}`} />
            <a
              href={
                isRoadmap
                  ? externalRoadmapLink
                  : `https://admin.microsoft.com/#/MessageCenter/:/messages/${msg?.Id}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-5 items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              <ExternalLink size={10} />
            </a>
          </div>
        </MetadataRow>

        <MetadataRow label="Source">
          <span className="text-sm">{sourceLabel}</span>
        </MetadataRow>

        <MetadataRow label="Severity">
          <span className="capitalize text-sm">{msg?.Severity || "Normal"}</span>
        </MetadataRow>

        <MetadataRow label="Major change">
          {msg?.IsMajorChange ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
              <AlertTriangle size={13} /> Yes
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No</span>
          )}
        </MetadataRow>

        <MetadataRow label="Category">
          {category ? (
            <span className="text-sm">{formatCategoryLabel(category)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </MetadataRow>

        <MetadataRow label="Services">
          <BadgeList values={services} hrefFor={(service) => `/service/${slugifyService(service)}`} />
        </MetadataRow>

        <MetadataRow label="Tags">
          <BadgeList variant="outline" values={tags} />
        </MetadataRow>

        {roadmapId && !isRoadmap && (
          <MetadataRow label="Roadmap">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono">{roadmapId}</span>
              <CopyButton value={roadmapId} label={`Copy roadmap ID ${roadmapId}`} />
              {internalRoadmapMessage ? (
                <Link
                  href={getCanonicalMessagePath(internalRoadmapMessage)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  <ExternalLink size={10} />
                </Link>
              ) : (
                <a
                  href={externalRoadmapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </MetadataRow>
        )}

        {status && (
          <MetadataRow label="Status">
            <BadgeList values={status.split(",").map((v) => v.trim())} />
          </MetadataRow>
        )}

        {releasePhase && (
          <MetadataRow label="Release">
            <BadgeList variant="outline" values={releasePhase.split(",").map((v) => v.trim())} />
          </MetadataRow>
        )}

        {platforms && (
          <MetadataRow label="Platforms">
            <BadgeList values={platforms.split(",").map((v) => v.trim())} />
          </MetadataRow>
        )}

        {clouds && (
          <MetadataRow label="Cloud">
            <BadgeList values={clouds.split(",").map((v) => v.trim())} />
          </MetadataRow>
        )}

        {referenceIds.length > 0 && (
          <MetadataRow label="Related">
            <span className="inline-flex items-center gap-1 text-sm">
              <Link2 size={13} className="text-muted-foreground" />
              {referenceIds.length} {referenceIds.length === 1 ? "announcement" : "announcements"}
            </span>
          </MetadataRow>
        )}
      </div>

      {/* Dates */}
      <div className="border-t border-border/60 px-4 py-3">
        <MessageDateTimeTable message={msg} />
      </div>

      {/* Version history link */}
      {hasHistory && showHistoryLink && (
        <div className="border-t border-border/60 px-4 py-3">
          <a
            href="#version-history"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <History size={14} />
            View version history
          </a>
        </div>
      )}

      {/* Similar messages */}
      {similarMessages.length > 0 && (
        <div className="border-t border-border/60 px-4 py-3">
          <h2 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Layers size={11} />
            Similar
          </h2>
          <div className="flex flex-col gap-1">
            {similarMessages.map((m) => (
              <Link
                key={m.Id}
                href={getCanonicalMessagePath(m)}
                className="group flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground">
                  {m.Id}
                </span>
                <span className="line-clamp-2 text-[12px] leading-snug text-foreground/80 group-hover:text-foreground">
                  {m.Title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
