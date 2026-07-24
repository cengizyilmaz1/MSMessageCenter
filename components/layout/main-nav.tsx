import Link from "next/link"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav({ items }: MainNavProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-inset ring-black/8 dark:ring-white/10">
          <img
            src="/favicon.ico"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            decoding="async"
            className="h-6 w-6 object-contain"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-5 text-foreground sm:hidden">
            M365 Archive
          </span>
          <span className="hidden truncate text-sm font-semibold leading-5 text-foreground sm:block">
            {siteConfig.name}
          </span>
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-0.5 md:flex">
          {items?.map((item, index) =>
            item.href ? (
              item.disabled ? (
                <span
                  key={index}
                  aria-disabled="true"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                    "cursor-not-allowed opacity-60"
                  )}
                >
                  {item.title}
                </span>
              ) : (
                <Link
                  key={index}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.title}
                </Link>
              )
            ) : null
          )}
        </nav>
      ) : null}
    </div>
  )
}
