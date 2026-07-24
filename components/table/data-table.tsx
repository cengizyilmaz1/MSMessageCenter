"use client"

import "./table.css"
import React from "react"
import Link from "next/link"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Milestone,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"

import type { MessageArchive } from "@/types/message"
import { getCanonicalMessagePath } from "@/lib/slugs.mjs"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { MessageView } from "@/components/table/columns"

type SourceFilter = "all" | "messageCenter" | "roadmap"

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

function toArchiveMessageView(item: MessageArchive): MessageView {
  return {
    id: item.Id,
    title: item.Title,
    href: getCanonicalMessagePath(item),
    service: item.Services,
    category: item.Category,
    published: item.StartDateTime
      ? new Date(item.StartDateTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : undefined,
    lastUpdated: item.LastModifiedDateTime
      ? new Date(item.LastModifiedDateTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : undefined,
    actionRequiredBy: undefined,
    isMajor: item.IsMajorChange ?? false,
    isArchived: true,
    source: "messageCenter",
    sourceLabel: "Message Center",
  }
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | "...")[] = []
  pages.push(1)
  if (currentPage > 4) pages.push("...")
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  if (currentPage < totalPages - 3) pages.push("...")
  pages.push(totalPages)
  return pages
}

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems)
  const to = Math.min(currentPage * pageSize, totalItems)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t bg-muted/10 px-4 py-3 sm:flex-row">
      {/* Left: count + page size */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {totalItems === 0
            ? "No results"
            : `${from}-${to} of ${totalItems.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Per page:</span>
          <div className="relative inline-flex">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 appearance-none rounded border bg-background pl-2 pr-6 text-xs font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Right: page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="First page"
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={13} />
          </button>

          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="inline-flex h-7 w-7 items-center justify-center text-xs text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded border px-1.5 text-xs font-medium transition-colors ${
                  p === currentPage
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Last page"
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

interface DataTableProps {
  columns: ColumnDef<MessageView>[]
  data: MessageView[]
  archiveUrl?: string
  services: string[]
  initialSourceFilter?: SourceFilter
}

export function DataTable({
  columns,
  data,
  archiveUrl,
  services,
  initialSourceFilter = "all",
}: DataTableProps) {
  const getColumnClassName = (columnId: string) => {
    if (columnId === "service") return "hidden lg:table-cell lg:w-[17rem] xl:w-[20rem]"
    if (columnId === "published" || columnId === "lastUpdated") return "hidden lg:table-cell lg:w-[9rem]"
    if (columnId === "actions") return "w-[3rem]"
    return ""  // id (title) column: takes all remaining space
  }

  const [allData, setAllData] = React.useState<MessageView[]>(data)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>(initialSourceFilter)
  const [selectedServices, setSelectedServices] = React.useState<string[]>([])
  const [serviceSearch, setServiceSearch] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [isServiceFilterOpen, setIsServiceFilterOpen] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  const serviceFilterRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { setAllData(data) }, [data])
  React.useEffect(() => { setSourceFilter(initialSourceFilter) }, [initialSourceFilter])

  React.useEffect(() => {
    if (!archiveUrl) return
    let isMounted = true
    fetch(archiveUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((items: MessageArchive[]) => {
        if (!isMounted) return
        const archiveRows = items.map(toArchiveMessageView)
        setAllData((current) => {
          const existingIds = new Set(current.map((item) => item.id))
          return [...current, ...archiveRows.filter((item) => !existingIds.has(item.id))]
        })
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [archiveUrl])

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!serviceFilterRef.current?.contains(event.target as Node)) {
        setIsServiceFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const filteredServices = React.useMemo(() => {
    const s = serviceSearch.trim().toLowerCase()
    return s ? services.filter((svc) => svc.toLowerCase().includes(s)) : services
  }, [serviceSearch, services])

  const searchableData = React.useMemo(
    () =>
      allData.map((item) => ({
        item,
        haystack: [item.id, item.title, item.sourceLabel, item.category, ...(item.service ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [allData]
  )

  const filteredData = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    return searchableData
      .filter(({ item, haystack }) => {
        const sourceMatches = sourceFilter === "all" || item.source === sourceFilter
        const itemServices = item.service || []
        const serviceMatches =
          selectedServices.length === 0 ||
          selectedServices.some((svc) => itemServices.includes(svc))
        const searchMatches = !search || haystack.includes(search)
        return sourceMatches && serviceMatches && searchMatches
      })
      .map(({ item }) => item)
  }, [searchableData, query, selectedServices, sourceFilter])

  // Reset to page 1 when filters change
  React.useEffect(() => { setCurrentPage(1) }, [filteredData.length, query, selectedServices, sourceFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  })

  const allRows = table.getRowModel().rows
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((s) => s !== service)
        : [...current, service].sort((a, b) => a.localeCompare(b))
    )
  }

  const clearFilters = () => {
    setQuery("")
    setSelectedServices([])
    setSourceFilter(initialSourceFilter)
  }

  const hasActiveFilters =
    query !== "" || selectedServices.length > 0 || sourceFilter !== initialSourceFilter

  const selectedServiceLabel =
    selectedServices.length === 0
      ? "All services"
      : selectedServices.length === 1
        ? selectedServices[0]
        : `${selectedServices.length} services`

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Filter bar */}
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Source segmented control */}
          <div className="flex w-fit items-center gap-1 rounded-lg border bg-background p-1">
            {(
              [
                { value: "all" as const, label: "All", icon: undefined as typeof Inbox | undefined },
                { value: "messageCenter" as const, label: "Message Center", icon: Inbox as typeof Inbox | undefined },
                { value: "roadmap" as const, label: "Roadmap", icon: Milestone as typeof Inbox | undefined },
              ]
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSourceFilter(value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all ${
                  sourceFilter === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {Icon && <Icon size={13} />}
                {label}
              </button>
            ))}
          </div>

          {/* Search + service filter */}
          <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_16rem_auto] xl:w-[52rem]">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ID, title, service..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Service filter */}
            <div ref={serviceFilterRef} className="relative">
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors hover:bg-accent"
                onClick={() => setIsServiceFilterOpen((v) => !v)}
                aria-expanded={isServiceFilterOpen}
              >
                <span className={`truncate text-left ${selectedServices.length > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {selectedServiceLabel}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isServiceFilterOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isServiceFilterOpen && (
                <div className="absolute right-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border bg-popover shadow-lg sm:w-80">
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <span className="text-xs text-muted-foreground">{selectedServices.length} selected</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedServices([])}
                      >
                        <X size={12} /> Clear all
                      </button>
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto p-1">
                    {filteredServices.length ? (
                      filteredServices.map((service) => {
                        const isSelected = selectedServices.includes(service)
                        return (
                          <button
                            key={service}
                            type="button"
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                            onClick={() => toggleService(service)}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{service}</span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-2 py-8 text-center text-sm text-muted-foreground">No services found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent ${hasActiveFilters ? "text-foreground" : "text-muted-foreground"}`}
            >
              <SlidersHorizontal size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-[52rem]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b bg-muted/25 hover:bg-muted/25">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`${getColumnClassName(header.column.id)} px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
                <TableHead aria-label="Detail page link" className="hidden p-0 md:table-cell" />
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`group relative border-b border-border/50 transition-colors hover:bg-muted/20 ${
                    row.original.isMajor ? "border-l-2 border-l-red-500 dark:border-l-red-500" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`${getColumnClassName(cell.column.id)} px-4 py-2 align-top`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell className="hidden p-0 md:table-cell">
                    <Link
                      className="row-link"
                      href={row.original.href}
                      aria-label={`Open ${row.original.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search size={22} className="opacity-30" />
                    <span className="text-sm">No results found.</span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={allRows.length}
        onPageChange={(p) => {
          setCurrentPage(p)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
      />
    </div>
  )
}
