import React from "react"

import { Message } from "@/types/message"

interface DateEntry {
  label: string
  raw: string
  formatted: string
}

function safeFormatDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(d)
  } catch {
    return null
  }
}

export default function MessageDateTimeTable({
  message,
}: {
  message: Message | undefined
}) {
  if (!message) return null

  const dates: DateEntry[] = []

  const addDate = (label: string, rawValue: string | undefined | null) => {
    if (!rawValue) return
    const formatted = safeFormatDate(rawValue)
    if (formatted) {
      dates.push({ label, raw: rawValue, formatted })
    }
  }

  addDate("Last updated", message.LastModifiedDateTime)
  addDate("Start date", message.StartDateTime)
  addDate("End date", message.EndDateTime)
  addDate("Action required by", message.ActionRequiredByDateTime)

  if (message.Details && Array.isArray(message.Details)) {
    for (const detail of message.Details) {
      if (!detail.Name || !detail.Value) continue

      const lowerName = detail.Name.toLowerCase()
      if (
        lowerName.includes("date") ||
        lowerName.includes("time") ||
        detail.Value.match(/^\d{4}-\d{2}-\d{2}T/)
      ) {
        if (lowerName === "update") continue

        const label = detail.Name.replace(/([A-Z])/g, " $1").trim()
        const isDuplicate = dates.some((d) => d.raw === detail.Value)
        if (!isDuplicate) {
          addDate(label, detail.Value)
        }
      }
    }
  }

  if (dates.length === 0) return null

  return (
    <div className="w-full">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Timeline
      </h2>
      <div className="flex flex-col">
        {dates.map((d, index) => (
          <div
            key={index}
            className="grid grid-cols-[90px_1fr] gap-3 border-b border-border/60 py-2.5 last:border-0 items-start"
          >
            <span className="text-xs font-medium text-muted-foreground pt-0.5">
              {d.label}
            </span>
            <span className="text-sm text-foreground">
              {d.formatted}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
