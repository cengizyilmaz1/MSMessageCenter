"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Search, X, ArrowRight } from "lucide-react"

interface SearchItem {
  id: string
  title: string
  href: string
  source: string
  service: string[]
}

interface IndexRecord {
  Id: string
  Title: string
  Source: string
  Url: string
  Services?: string[]
}

let searchItemsCache: SearchItem[] | null = null
let searchItemsPromise: Promise<SearchItem[]> | null = null

function toPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url || "/"
  }
}

function loadSearchItems(): Promise<SearchItem[]> {
  if (searchItemsCache) return Promise.resolve(searchItemsCache)
  if (!searchItemsPromise) {
    searchItemsPromise = fetch("/search-index.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((records: IndexRecord[]) => {
        const items = records.map((record) => ({
          id: record.Id,
          title: record.Title,
          href: toPath(record.Url),
          source: record.Source,
          service: record.Services ?? [],
        }))
        searchItemsCache = items
        return items
      })
      .catch(() => [])
  }
  return searchItemsPromise
}

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<SearchItem[]>(searchItemsCache ?? [])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setQuery("")
        setOpen((v) => !v)
      }
      if (e.key === "Escape") {
        setQuery("")
        setOpen(false)
      }
    }
    window.addEventListener("keydown", keyHandler)
    return () => window.removeEventListener("keydown", keyHandler)
  }, [])

  useEffect(() => {
    if (open) {
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(focusTimer)
    }
  }, [open])

  useEffect(() => {
    if (!open || searchItemsCache) return
    let cancelled = false
    setLoading(true)
    loadSearchItems().then((items) => {
      if (!cancelled) {
        setMessages(items)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const closeSearch = () => {
    setQuery("")
    setOpen(false)
  }

  const searchable = useMemo(
    () =>
      messages.map((m) => ({
        item: m,
        id: m.id.toLowerCase(),
        title: m.title.toLowerCase(),
        services: m.service.map((s) => s.toLowerCase()),
      })),
    [messages]
  )

  const q = query.trim().toLowerCase()
  const results = useMemo(
    () =>
      q.length < 2
        ? []
        : searchable
            .filter(
              (m) =>
                m.id.includes(q) ||
                m.title.includes(q) ||
                m.services.some((s) => s.includes(q))
            )
            .slice(0, 8)
            .map((m) => m.item),
    [searchable, q]
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={closeSearch}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-xl rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, roadmap, services..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 text-muted-foreground/60 hover:text-foreground"
              aria-label="Clear"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.href}
                  onClick={closeSearch}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-px font-mono text-[10px] font-medium ${
                      m.source === "roadmap"
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    }`}
                  >
                    {m.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {m.title}
                  </span>
                  <ArrowRight size={12} className="shrink-0 text-muted-foreground/40" />
                </Link>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading search index...
          </div>
        ) : q.length >= 2 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className="px-4 py-5 text-center text-xs text-muted-foreground/60">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  )
}
