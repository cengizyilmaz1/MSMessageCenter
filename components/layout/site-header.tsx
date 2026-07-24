import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { siteConfig } from "@/config/site"
import { MainNav } from "@/components/layout/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchCommandWrapper } from "@/components/search/search-command-wrapper"

export function SiteHeader() {
  return (
    <>
      <SearchCommandWrapper />
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-14 min-w-0 items-center justify-between gap-3">
          <MainNav items={siteConfig.mainNav} />

          <div className="flex shrink-0 items-center gap-1">
            {/* cengizyilmaz.net */}
            <Link
              href={siteConfig.links.portfolio}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
            >
              cengizyilmaz.net
              <ExternalLink size={10} className="opacity-50" />
            </Link>

            {/* Tool links */}
            <div className="hidden items-center lg:flex">
              <div className="ml-0.5 mr-1 h-4 w-px bg-border/70" />
              <div className="flex items-center gap-0.5">
                <Link href={siteConfig.links.permissions} target="_blank" rel="noreferrer"
                  className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  Permissions
                </Link>
                <Link href={siteConfig.links.tenantFinder} target="_blank" rel="noreferrer"
                  className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  Tenant Finder
                </Link>
                <Link href={siteConfig.links.m365Report} target="_blank" rel="noreferrer"
                  className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  M365 Report
                </Link>
              </div>
              <div className="mx-1.5 h-4 w-px bg-border/70" />
            </div>

            {/* RSS */}
            <a href="/rss.xml" title="RSS Feed" aria-label="RSS Feed"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
              </svg>
            </a>

            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  )
}
