import { MessageSource } from "@/types/message"
import {
  getMessageData,
  getMessageSource,
  getMessageSummary,
  linkifyMcIds,
} from "@/lib/messages"
import { ExpiredBanner } from "@/components/message/message-metadata"
import MessageContent from "@/components/message/message-content"
import MessageHistory from "@/components/message/message-history"
import RelatedMessages from "@/components/message/related-messages"

export default function MessageDetail(props: { id: string }) {
  const msg = getMessageData(props.id)
  const summary = getMessageSummary(msg)
  const contentTitle =
    getMessageSource(msg) === MessageSource.Roadmap
      ? "Description"
      : "More information"
  const linkedBody = linkifyMcIds(msg?.Body?.Content || "", props.id)
  const escapedSummary = summary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  const linkedSummary = linkifyMcIds(escapedSummary, props.id)

  return (
    <div className="flex w-full max-w-none flex-col items-start gap-4">
      <ExpiredBanner id={props.id} />

      {summary && (
        <section className="w-full rounded-xl border bg-card px-5 py-4 shadow-sm">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Summary
          </h2>
          <p
            className="text-base leading-7 text-foreground/85"
            dangerouslySetInnerHTML={{ __html: linkedSummary }}
          />
        </section>
      )}

      <section className="w-full rounded-xl border bg-card px-5 py-4 shadow-sm">
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {contentTitle}
        </h2>
        <MessageContent html={linkedBody} />
      </section>

      <RelatedMessages id={props.id} />

      <section id="version-history" className="w-full scroll-mt-20">
        <MessageHistory id={props.id} />
      </section>
    </div>
  )
}
