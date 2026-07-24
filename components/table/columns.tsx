"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Archive, ArrowUpRight, Clock } from "lucide-react"

import { formatCategoryLabel } from "@/lib/filters"
import {
  getCategoryIcon,
  getSourceIcon,
} from "@/components/message/message-icons"
import { slugifyService } from "@/lib/slugs.mjs"

export type MessageView = {
  id: string
  title: string
  href: string
  service: string[] | undefined
  category: string | undefined
  published: string | undefined
  lastUpdated: string | undefined
  actionRequiredBy: string | undefined
  isMajor: boolean
  isArchived: boolean
  source: "messageCenter" | "roadmap"
  sourceLabel: string
}

export const columns: ColumnDef<MessageView>[] = [
  {
    accessorKey: "id",
    header: () => <span>Message</span>,
    cell: ({ row }) => {
      const SourceIcon = getSourceIcon(row.original.source)
      const isRoadmap = row.original.source === "roadmap"
      return (
        <div className="flex flex-col gap-1 py-0.5">
          {/* Meta row: ID + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-px font-mono text-[11px] font-medium tracking-tight ${
                isRoadmap
                  ? "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
              }`}
            >
              <SourceIcon size={10} aria-label={row.original.sourceLabel} />
              {row.original.id}
            </span>

            {row.original.isArchived && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-400">
                <Archive size={9} />
                Archived
              </span>
            )}

            {row.original.isMajor && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
                <AlertTriangle size={9} />
                Major
              </span>
            )}

            {row.original.actionRequiredBy && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-px text-[10px] font-semibold text-orange-700 dark:border-orange-700/40 dark:bg-orange-950/30 dark:text-orange-400">
                <Clock size={9} />
                Action by {row.original.actionRequiredBy}
              </span>
            )}
          </div>

          {/* Title */}
          <Link
            href={row.original.href}
            className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground transition-colors hover:text-primary"
          >
            {row.original.title}
          </Link>

          {/* Mobile meta */}
          <div className="flex flex-wrap items-center gap-1.5 md:hidden">
            <span className="text-[11px] text-muted-foreground">{row.original.published}</span>
            {row.original.service?.[0] && (
              <>
                <span className="text-muted-foreground/30">|</span>
                <span className="max-w-[130px] truncate text-[11px] text-muted-foreground">
                  {row.original.service[0]}
                </span>
              </>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "service",
    header: () => <span>Services</span>,
    cell: ({ row }) => {
      const services = row.original.service ?? []
      const visible = services.slice(0, 2)
      const overflow = services.length - visible.length
      const category = row.original.category
      const CategoryIcon = category ? getCategoryIcon(category) : null

      return (
        <div className="flex flex-col gap-1.5 py-0.5">
          <div className="flex flex-wrap gap-1">
            {visible.map((service) => (
              <Link
                key={service}
                href={`/service/${slugifyService(service)}`}
                className="inline-flex items-center rounded-md border bg-muted/30 px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="max-w-[120px] truncate">{service}</span>
              </Link>
            ))}
            {overflow > 0 && (
              <span className="inline-flex items-center rounded-md border bg-muted/20 px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">
                +{overflow}
              </span>
            )}
          </div>
          {CategoryIcon && category && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <CategoryIcon size={10} />
              <span>{formatCategoryLabel(category)}</span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "published",
    header: () => <span className="text-nowrap">Published</span>,
    cell: ({ row }) => (
      <span className="text-nowrap text-[12px] tabular-nums text-muted-foreground/70">
        {row.original.published || "-"}
      </span>
    ),
  },
  {
    accessorKey: "lastUpdated",
    header: () => <span className="text-nowrap">Updated</span>,
    cell: ({ row }) => (
      <span className="text-nowrap text-[12px] tabular-nums text-muted-foreground/70">
        {row.original.lastUpdated || "-"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Link
          href={row.original.href}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30 transition-all group-hover:text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="View details"
        >
          <ArrowUpRight size={14} />
        </Link>
      </div>
    ),
  },
]
