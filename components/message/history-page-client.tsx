"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowLeftRight, GitCompare, History } from "lucide-react"
import htmldiff from "node-htmldiff"

import MessageContent from "@/components/message/message-content"
import MessageDateTimeTable from "@/components/message/message-date-time-table"
import { Badge } from "@/components/ui/badge"
import type { Message, MessageHistory, MessageVersion } from "@/types/message"

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: MessageHistory }

type MessagePathMap = Record<string, string>

let messagePathCache: MessagePathMap | null = null
let messagePathPromise: Promise<MessagePathMap> | null = null

const MC_ID_RE = /\bMC\d{6,7}\b/g

function slugifyCapturedAt(capturedAt: string): string {
  return capturedAt.replace(/[:.]/g, "-")
}

function formatDate(dateInput: string | undefined | null): string {
  if (!dateInput) return ""
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function getDetail(message: Message | undefined, name: string): string {
  return message?.Details?.find((detail) => detail.Name === name)?.Value ?? ""
}

function getSourceLabel(message: Message | undefined): string {
  return message?.Source === "roadmap" ? "Microsoft 365 Roadmap" : "Message Center"
}

function loadMessagePaths(): Promise<MessagePathMap> {
  if (messagePathCache) return Promise.resolve(messagePathCache)
  if (!messagePathPromise) {
    messagePathPromise = fetch("/message-paths.json")
      .then((response) => (response.ok ? response.json() : {}))
      .then((paths: MessagePathMap) => {
        messagePathCache = paths
        return paths
      })
      .catch(() => ({}))
  }
  return messagePathPromise
}

function linkifyMcIds(
  html: string,
  currentId: string,
  messagePaths: MessagePathMap | null
): string {
  if (!html || !messagePaths || !MC_ID_RE.test(html)) return html
  MC_ID_RE.lastIndex = 0

  let output = ""
  let index = 0
  let anchorDepth = 0

  while (index < html.length) {
    if (html[index] === "<") {
      const end = html.indexOf(">", index)
      if (end === -1) {
        output += html.slice(index)
        break
      }

      const tag = html.slice(index, end + 1)
      const lower = tag.toLowerCase()
      if (/^<a\b/.test(lower)) anchorDepth += 1
      if (/^<\/a\s*>/.test(lower)) anchorDepth = Math.max(0, anchorDepth - 1)
      output += tag
      index = end + 1
      continue
    }

    const next = html.indexOf("<", index)
    const segment = next === -1 ? html.slice(index) : html.slice(index, next)
    output +=
      anchorDepth > 0
        ? segment
        : segment.replace(MC_ID_RE, (match) => {
            if (match === currentId) return match
            const href = messagePaths[match]
            if (!href) return match
            return `<a href="${href}" class="mc-ref-link" data-mc-ref="${match}">${match}</a>`
          })

    if (next === -1) break
    index = next
  }

  return output
}

function useHistory(messageId: string): HistoryState {
  const [state, setState] = useState<HistoryState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })

    fetch(`/history/${encodeURIComponent(messageId)}.json`)
      .then((response) => {
        if (!response.ok) throw new Error("History file was not found.")
        return response.json()
      })
      .then((history: MessageHistory) => {
        if (!cancelled) setState({ status: "ready", history })
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error.message || "History could not be loaded.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [messageId])

  return state
}

function useLinkifiedHtml(html: string, currentId: string): string {
  const [messagePaths, setMessagePaths] = useState<MessagePathMap | null>(
    messagePathCache
  )

  useEffect(() => {
    if (!html.match(MC_ID_RE)) return
    let cancelled = false
    loadMessagePaths().then((paths) => {
      if (!cancelled) setMessagePaths(paths)
    })
    return () => {
      cancelled = true
    }
  }, [html])

  return useMemo(
    () => linkifyMcIds(html, currentId, messagePaths),
    [currentId, html, messagePaths]
  )
}

function findVersion(
  history: MessageHistory,
  capturedAtSlug: string
): MessageVersion | undefined {
  return history.versions.find(
    (version) => slugifyCapturedAt(version.capturedAt) === capturedAtSlug
  )
}

function LoadingPanel() {
  return (
    <section className="w-full rounded-md border bg-card p-5 text-sm text-muted-foreground shadow-sm">
      Loading version history...
    </section>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="w-full rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-200">
      {message}
    </section>
  )
}

function MetadataPanel({ message }: { message: Message }) {
  const rows = [
    ["ID", getDetail(message, "SourceId") || message.Id],
    ["Source", getSourceLabel(message)],
    ["Severity", message.Severity || "Normal"],
    ["Major change", message.IsMajorChange ? "Yes" : "No"],
    ["Category", message.Category || "-"],
    ["Services", (message.Services ?? []).join(", ") || "-"],
    ["Tags", (message.Tags ?? []).join(", ") || "-"],
  ]

  return (
    <section className="w-full rounded-md border bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h2>
      </div>
      <div className="px-4 py-1">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[120px_1fr] gap-3 border-b border-border/60 py-2.5 text-sm last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <span className={label === "ID" ? "font-mono" : ""}>{value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 px-4 py-3">
        <MessageDateTimeTable message={message} />
      </div>
    </section>
  )
}

function MetadataDiffPanel({
  oldMessage,
  newMessage,
}: {
  oldMessage: Message
  newMessage: Message
}) {
  const rows = [
    ["Title", oldMessage.Title ?? "", newMessage.Title ?? ""],
    [
      "Services",
      [...(oldMessage.Services ?? [])].sort().join(", "),
      [...(newMessage.Services ?? [])].sort().join(", "),
    ],
    [
      "Tags",
      [...(oldMessage.Tags ?? [])].sort().join(", "),
      [...(newMessage.Tags ?? [])].sort().join(", "),
    ],
    ["Category", oldMessage.Category ?? "", newMessage.Category ?? ""],
    ["Severity", oldMessage.Severity ?? "", newMessage.Severity ?? ""],
    [
      "Major change",
      oldMessage.IsMajorChange ? "Yes" : "No",
      newMessage.IsMajorChange ? "Yes" : "No",
    ],
    [
      "Action required by",
      formatDate(oldMessage.ActionRequiredByDateTime),
      formatDate(newMessage.ActionRequiredByDateTime),
    ],
    ["End date", formatDate(oldMessage.EndDateTime), formatDate(newMessage.EndDateTime)],
    ["Status", getDetail(oldMessage, "Status"), getDetail(newMessage, "Status")],
    [
      "Release phase",
      getDetail(oldMessage, "ReleasePhase"),
      getDetail(newMessage, "ReleasePhase"),
    ],
    ["Platforms", getDetail(oldMessage, "Platforms"), getDetail(newMessage, "Platforms")],
    [
      "Cloud instances",
      getDetail(oldMessage, "CloudInstances"),
      getDetail(newMessage, "CloudInstances"),
    ],
  ].filter(([, oldValue, newValue]) => oldValue !== newValue)

  return (
    <section className="w-full rounded-md border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
        Metadata changes
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tracked metadata fields changed between these versions.
        </p>
      ) : (
        <dl className="divide-y divide-border">
          {rows.map(([label, oldValue, newValue]) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr]"
            >
              <dt className="text-sm font-medium text-foreground/80">
                {label}
              </dt>
              <dd className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className={oldValue ? "diff-del" : "text-muted-foreground italic"}>
                  {oldValue || "empty"}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  {"->"}
                </span>
                <span className={newValue ? "diff-ins" : "text-muted-foreground italic"}>
                  {newValue || "empty"}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function LinkedMessageContent({
  html,
  currentId,
}: {
  html: string
  currentId: string
}) {
  const linkedHtml = useLinkifiedHtml(html, currentId)
  return <MessageContent html={linkedHtml} />
}

function ClientBodyDiff({
  oldHtml,
  newHtml,
  currentId,
}: {
  oldHtml: string
  newHtml: string
  currentId: string
}) {
  const diffed = useMemo(() => htmldiff(oldHtml || "", newHtml || ""), [
    oldHtml,
    newHtml,
  ])
  const linkedHtml = useLinkifiedHtml(diffed, currentId)
  return <MessageContent html={linkedHtml} />
}

export function VersionHistoryClient({
  basePath,
  capturedAt,
  messageId,
}: {
  basePath: string
  capturedAt: string
  messageId: string
}) {
  const state = useHistory(messageId)

  if (state.status === "loading") return <LoadingPanel />
  if (state.status === "error") return <ErrorPanel message={state.message} />

  const version = findVersion(state.history, capturedAt)
  const latest = state.history.versions[state.history.versions.length - 1]
  if (!version || !latest) return <ErrorPanel message="Version was not found." />

  const isLatest = version.capturedAt === latest.capturedAt
  const latestSlug = slugifyCapturedAt(latest.capturedAt)
  const versionSlug = slugifyCapturedAt(version.capturedAt)
  const sourceLabel = getSourceLabel(version.message)

  return (
    <div className="flex min-w-0 flex-col items-start gap-5">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={14} /> Back to latest version
      </Link>

      <div className="flex w-full flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100">
        <div className="flex flex-wrap items-center gap-2">
          <History size={16} />
          <span>
            Historical snapshot from{" "}
            <strong>{formatDate(version.capturedAt)}</strong>.
            {!isLatest && " This is not the latest version."}
          </span>
        </div>
        {!isLatest && (
          <div className="flex flex-wrap gap-3">
            <Link href={basePath} className="font-medium underline underline-offset-4">
              View latest
            </Link>
            <Link
              href={`${basePath}/compare?from=${versionSlug}&to=${latestSlug}`}
              className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
            >
              <GitCompare size={14} /> Compare to latest
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{sourceLabel}</Badge>
        <Badge variant="secondary">{formatDate(version.capturedAt)}</Badge>
      </div>

      <h1 className="max-w-6xl break-words text-3xl font-semibold leading-tight text-foreground md:text-5xl md:leading-tight">
        <span className="font-mono text-primary">{version.message.Id}</span>{" "}
        {version.message.Title}
      </h1>

      {!isLatest && <MetadataPanel message={version.message} />}

      {!isLatest && (
        <section className="w-full rounded-md border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Changes since this version
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="diff-del">removed text</span>
            <span className="diff-ins">added text</span>
          </div>
          <ClientBodyDiff
            oldHtml={version.message.Body?.Content || ""}
            newHtml={latest.message.Body?.Content || ""}
            currentId={messageId}
          />
        </section>
      )}

      <section className="w-full rounded-md border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
          Snapshot body
        </h2>
        <LinkedMessageContent
          html={version.message.Body?.Content || ""}
          currentId={messageId}
        />
      </section>
    </div>
  )
}

export function CompareHistoryClient({
  basePath,
  messageId,
}: {
  basePath: string
  messageId: string
}) {
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const state = useHistory(messageId)

  if (state.status === "loading") return <LoadingPanel />
  if (state.status === "error") return <ErrorPanel message={state.message} />

  const fromVersion = findVersion(state.history, from)
  const toVersion = findVersion(state.history, to)
  const latest = state.history.versions[state.history.versions.length - 1]

  if (!fromVersion || !toVersion || !latest) {
    return <ErrorPanel message="Comparison versions were not found." />
  }

  const isToLatest = toVersion.capturedAt === latest.capturedAt
  const fromDate = formatDate(fromVersion.capturedAt)
  const toDate = formatDate(toVersion.capturedAt)
  const sourceLabel = getSourceLabel(toVersion.message)
  const swapHref = `${basePath}/compare?from=${slugifyCapturedAt(
    toVersion.capturedAt
  )}&to=${slugifyCapturedAt(fromVersion.capturedAt)}`

  return (
    <div className="flex min-w-0 flex-col items-start gap-5">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={14} /> Back to latest version
      </Link>

      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
        <GitCompare size={16} />
        <span>
          Comparing{" "}
          <Link
            href={`${basePath}/v/${slugifyCapturedAt(fromVersion.capturedAt)}`}
            className="text-foreground underline underline-offset-4"
          >
            {fromDate}
          </Link>{" "}
          {"->"}{" "}
          {isToLatest ? (
            <span className="text-foreground">latest ({toDate})</span>
          ) : (
            <Link
              href={`${basePath}/v/${slugifyCapturedAt(toVersion.capturedAt)}`}
              className="text-foreground underline underline-offset-4"
            >
              {toDate}
            </Link>
          )}
        </span>
        <Link
          href={swapHref}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          <ArrowLeftRight size={12} /> Swap
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{sourceLabel}</Badge>
        <Badge variant="secondary">
          {fromDate} to {toDate}
        </Badge>
      </div>

      <h1 className="max-w-6xl break-words text-3xl font-semibold leading-tight text-foreground md:text-5xl md:leading-tight">
        <span className="font-mono text-primary">{toVersion.message.Id}</span>{" "}
        {toVersion.message.Title}
      </h1>

      <MetadataPanel message={toVersion.message} />

      <div className="w-full space-y-4">
        <MetadataDiffPanel
          oldMessage={fromVersion.message}
          newMessage={toVersion.message}
        />

        <section className="w-full rounded-md border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Body changes
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="diff-del">removed text</span>
            <span className="diff-ins">added text</span>
          </div>
          <ClientBodyDiff
            oldHtml={fromVersion.message.Body?.Content || ""}
            newHtml={toVersion.message.Body?.Content || ""}
            currentId={messageId}
          />
        </section>
      </div>
    </div>
  )
}
