import { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"

export const dynamic = "force-static"

/**
 * Answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot) only cite
 * sources they are permitted to fetch, and several of them respect a distinct
 * user-agent from the classic search crawler. Listing them explicitly makes the
 * archive citable rather than relying on a generous reading of the wildcard.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "cohere-ai",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "YouBot",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
