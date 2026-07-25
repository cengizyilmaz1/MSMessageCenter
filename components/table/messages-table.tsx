import { DataTable } from "@/components/table/data-table"
import { MessageView, columns } from "@/components/table/columns"
import { Message, MessageArchive } from "@/types/message"
import {
  getAllMessages,
  getFormattedDate,
  getMessageSource,
  getMessageSourceLabel,
} from "@/lib/messages"
import { getCanonicalMessagePath } from "@/lib/slugs.mjs"
import tableServices from "@/@data/table-services.json"

type SourceFilter = "all" | "messageCenter" | "roadmap"
type TableScope = "all" | "roadmap" | "archive"

interface MessagesTableProps {
  messages?: Message[]
  archiveMessages?: MessageArchive[]
  /** Which slice of the shared feed the client should keep after hydration. */
  scope?: TableScope
  services?: string[]
  initialSourceFilter?: SourceFilter
}

export function toMessageView(item: Message): MessageView {
  const source = getMessageSource(item)

  return {
    id: item.Id,
    title: item.Title,
    href: getCanonicalMessagePath(item),
    service: item.Services,
    category: item.Category,
    published: getFormattedDate(item.StartDateTime),
    lastUpdated: getFormattedDate(item.LastModifiedDateTime),
    actionRequiredBy: item.ActionRequiredByDateTime
      ? getFormattedDate(item.ActionRequiredByDateTime)
      : undefined,
    isMajor: item.IsMajorChange ?? false,
    isArchived: false,
    source,
    sourceLabel: getMessageSourceLabel(item),
  }
}

export function toArchiveMessageView(item: MessageArchive): MessageView {
  return {
    id: item.Id,
    title: item.Title,
    href: getCanonicalMessagePath(item),
    service: item.Services,
    category: item.Category,
    published: getFormattedDate(item.StartDateTime),
    lastUpdated: getFormattedDate(item.LastModifiedDateTime),
    actionRequiredBy: undefined,
    isMajor: item.IsMajorChange ?? false,
    isArchived: true,
    source: "messageCenter",
    sourceLabel: "Message Center",
  }
}

/**
 * Number of rows rendered into the HTML. The browser replaces them with the
 * full dataset from table-index.json once it hydrates, so this only needs to be
 * enough for a useful first paint and a real set of links for crawlers.
 */
export const SERVER_ROWS = 25

export default function MessagesTable({
  messages = getAllMessages(),
  archiveMessages,
  scope = "all",
  services = tableServices,
  initialSourceFilter = "all",
}: MessagesTableProps) {
  const data = [
    ...messages.map(toMessageView),
    ...(archiveMessages ?? []).map(toArchiveMessageView),
  ].slice(0, SERVER_ROWS)

  return (
    <DataTable
      columns={columns}
      data={data}
      dataUrl="/table-index.json"
      scope={scope}
      services={services}
      initialSourceFilter={initialSourceFilter}
    />
  )
}
