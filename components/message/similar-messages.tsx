import Link from "next/link"
import { Layers } from "lucide-react"

import {
  getMessageData,
  getMessageSource,
  getMessageSourceLabel,
  getSimilarMessages,
} from "@/lib/messages"
import { getCanonicalMessagePath, slugifyService } from "@/lib/slugs.mjs"
import { MessageSource } from "@/types/message"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MAX_SIMILAR = 8

/**
 * Records that share a service, category or tag with this one.
 *
 * `RelatedMessages` only surfaces posts whose IDs are quoted in the body, which
 * leaves most detail pages as leaves in the link graph. Scoring by shared
 * metadata links every page to its neighbours, so crawlers can move sideways
 * through the archive instead of returning to a hub each time.
 */
export default function SimilarMessages(props: { id: string }) {
  const msg = getMessageData(props.id)
  if (!msg) return null

  const similar = getSimilarMessages(props.id, MAX_SIMILAR)
  const services = (msg.Services ?? []).filter(Boolean)
  if (similar.length === 0 && services.length === 0) return null

  const isRoadmap = getMessageSource(msg) === MessageSource.Roadmap

  return (
    <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers size={18} />
          {isRoadmap ? "Similar Roadmap items" : "Similar announcements"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {similar.length ? (
          <ul className="flex flex-col gap-1">
            {similar.map((item) => (
              <li key={item.Id}>
                <Link
                  href={getCanonicalMessagePath(item)}
                  className="group flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-sm text-blue-700 group-hover:underline dark:text-blue-300">
                      {item.Id}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {getMessageSourceLabel(item)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {item.Title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {services.length ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
            <span className="text-muted-foreground">All updates for</span>
            {services.map((service) => (
              <Link
                key={service}
                href={`/service/${slugifyService(service)}`}
                className="inline-flex h-7 items-center rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent"
              >
                {service}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
