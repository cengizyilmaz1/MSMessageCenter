"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable (non-secure context)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label ?? `Copy ${value}`}
      aria-label={label ?? `Copy ${value}`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
    >
      {copied ? (
        <Check size={11} strokeWidth={2.5} className="text-green-500" />
      ) : (
        <Copy size={11} />
      )}
    </button>
  )
}
