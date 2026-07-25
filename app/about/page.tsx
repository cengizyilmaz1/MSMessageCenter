import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { getLatestMessageDate, getMessageCounts } from "@/lib/messages"
import {
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  getFaqJsonLd,
} from "@/lib/seo"
import { JsonLd } from "@/components/seo/json-ld"
import { Breadcrumb } from "@/components/ui/breadcrumb"

const title = "About this archive"
const description =
  "How the Microsoft 365 Message Center and Roadmap archive is built, where the data comes from, how often it updates, and how to cite it."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${title} | ${siteConfig.name}`,
    description,
    url: "/about",
    images: ["/og-default.png"],
  },
}

const faqs = [
  {
    question: "Where does the data come from?",
    answer:
      "Message Center announcements are collected from the Microsoft Graph Service Communications API, and Roadmap items from the public Microsoft 365 Roadmap feed. Microsoft is the author of all announcement text; this site archives and cross-references it.",
  },
  {
    question: "How often is the archive updated?",
    answer:
      "An automated job ingests new and changed announcements daily. Every change is committed to version history, so each message keeps a complete, timestamped revision trail.",
  },
  {
    question: "Why does this exist when the Message Center is already in the admin center?",
    answer:
      "The Microsoft 365 admin center only shows messages targeted at your tenant, hides them once they expire, and does not show what changed between revisions. This archive is public, permanent, full-text searchable, and diffable.",
  },
  {
    question: "Is this an official Microsoft site?",
    answer:
      "No. It is an independent, non-affiliated reference archive. Always treat your own tenant's Message Center as the authoritative source for whether a change applies to you.",
  },
  {
    question: "Can AI assistants and search engines use this data?",
    answer:
      "Yes. A machine-readable index is published at /messages-index.json, a summary for language models at /llms.txt, and an RSS feed at /rss.xml. Cite the canonical URL of the individual message page.",
  },
]

const releaseNotes = [
  {
    date: "2026-07-24",
    items: [
      "Service pages now list every announcement and Roadmap item recorded for that service, grouped by year, so all 5,730 detail pages are reachable through real links rather than the sitemap alone. This replaces the separate /browse section, which has been removed.",
      "Added a services directory at /service listing every Microsoft 365 workload in the archive.",
      "Added this About page with sourcing, update cadence, and citation guidance.",
      "Rebuilt structured data: messages now use TechArticle, and the site publishes Dataset, CollectionPage, ItemList, and FAQ schema.",
      "robots.txt now names the major AI answer-engine crawlers explicitly so the archive can be cited.",
    ],
  },
]

export default function AboutPage() {
  const counts = getMessageCounts()
  const latest = getLatestMessageDate()

  return (
    <main className="page-shell">
      <JsonLd
        data={getCollectionPageJsonLd({
          path: "/about",
          name: title,
          description,
        })}
      />
      <JsonLd data={getFaqJsonLd(faqs)} />
      <JsonLd data={getBreadcrumbJsonLd([{ label: "About" }])} />

      <Breadcrumb items={[{ label: "About" }]} />

      <section className="page-intro">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Active announcements", value: counts.active },
          { label: "Roadmap items", value: counts.roadmap },
          { label: "Expired, preserved", value: counts.archive },
          { label: "Major changes", value: counts.major },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {stat.value.toLocaleString("en-US")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">What this is</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
          <p>
            {siteConfig.name} is an independent, public archive of Microsoft 365
            Message Center announcements and Microsoft 365 Roadmap items,
            maintained by{" "}
            <a
              href={siteConfig.parentUrl}
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {siteConfig.owner}
            </a>
            , a Microsoft MVP working in Microsoft 365 administration.
          </p>
          <p>
            The Microsoft 365 admin center only surfaces messages that target
            your tenant, and it removes them once they expire. That makes it hard
            to answer questions like &ldquo;when was this change first
            announced?&rdquo; or &ldquo;what did the rollout date say before it
            slipped?&rdquo;. This archive keeps every announcement permanently,
            records a new version each time Microsoft edits one, and lets you
            diff any two revisions.
          </p>
          <p>
            All announcement text is authored by Microsoft and reproduced here
            for reference. This site is not affiliated with or endorsed by
            Microsoft.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">How it is built</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            Message Center data is read from the Microsoft Graph Service
            Communications API; Roadmap data from the public Microsoft 365
            Roadmap feed.
          </li>
          <li>
            Each ingest hashes every message and appends a new version entry
            whenever the content changes, producing a full revision history.
          </li>
          <li>
            The site is rendered as fully static HTML — every message page exists
            as a real file, with no client-side data fetching required to read
            it.
          </li>
          <li>
            Machine-readable outputs are published on every build:{" "}
            <a href="/messages-index.json" className="underline underline-offset-4">
              /messages-index.json
            </a>
            ,{" "}
            <a href="/rss.xml" className="underline underline-offset-4">
              /rss.xml
            </a>
            , and{" "}
            <a href="/llms.txt" className="underline underline-offset-4">
              /llms.txt
            </a>
            .
          </li>
          {latest ? (
            <li>
              Most recent announcement change in the archive:{" "}
              <time dateTime={latest}>
                {new Date(latest).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              .
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <dl className="mt-3 flex flex-col gap-5">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-sm font-medium text-foreground">
                {faq.question}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Release notes</h2>
        <div className="mt-3 flex flex-col gap-6">
          {releaseNotes.map((entry) => (
            <div key={entry.date}>
              <h3 className="font-mono text-sm font-medium text-foreground">
                <time dateTime={entry.date}>{entry.date}</time>
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Start browsing</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/service"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Browse by service
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Microsoft 365 Roadmap
          </Link>
          <Link
            href="/archive"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Expired announcements
          </Link>
        </div>
      </section>
    </main>
  )
}
