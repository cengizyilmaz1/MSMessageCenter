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

interface MessagesTableProps {
  messages?: Message[]
  archiveMessages?: MessageArchive[]
  includeArchiveFetch?: boolean
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

export default function MessagesTable({
  messages = getAllMessages(),
  archiveMessages,
  includeArchiveFetch = true,
  services = tableServices,
  initialSourceFilter = "all",
}: MessagesTableProps) {
  const data = [
    ...messages.map(toMessageView),
    ...(archiveMessages ?? []).map(toArchiveMessageView),
  ]
  const archiveUrl =
    includeArchiveFetch && !archiveMessages ? "/messages-archive.json" : undefined

  return (
    <DataTable
      columns={columns}
      data={data}
      archiveUrl={archiveUrl}
      services={services}
      initialSourceFilter={initialSourceFilter}
    />
  )
}
