import Link from "next/link"

import { siteConfig } from "@/config/site"

function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function IconLinkedin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card/60">
      <div className="container py-10 md:py-12">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex w-fit items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-inset ring-black/8 dark:ring-white/10">
                <img
                  src="/favicon.ico"
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  loading="lazy"
                  decoding="async"
                  className="h-6 w-6 object-contain"
                />
              </span>
              <span className="font-semibold text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              A searchable archive for tracking Microsoft 365 tenant-relevant
              announcements, rollout dates, and service updates.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-1">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <IconGithub className="h-4 w-4" />
              </a>
              <a
                href={siteConfig.links.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <IconLinkedin className="h-4 w-4" />
              </a>
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noreferrer"
                aria-label="X / Twitter"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </a>
              <a
                href="/rss.xml"
                aria-label="RSS Feed"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Archive
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/service" className="text-muted-foreground transition-colors hover:text-foreground">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/archive" className="text-muted-foreground transition-colors hover:text-foreground">
                    Archive
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap" className="text-muted-foreground transition-colors hover:text-foreground">
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tools
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <a href={siteConfig.links.permissions} target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">
                    Permissions
                  </a>
                </li>
                <li>
                  <a href={siteConfig.links.tenantFinder} target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">
                    Tenant Finder
                  </a>
                </li>
                <li>
                  <a href={siteConfig.links.m365Report} target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-foreground">
                    M365 Report
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row">
          <p>Copyright {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p className="text-center md:text-right">
            Data sourced from Microsoft 365 Message Center - Not affiliated with Microsoft
          </p>
        </div>
      </div>
    </footer>
  )
}
