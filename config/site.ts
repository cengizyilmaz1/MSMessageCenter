export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Microsoft 365 Message Center Archive",
  owner: "Cengiz YILMAZ",
  url: "https://message.cengizyilmaz.net",
  parentUrl: "https://cengizyilmaz.net",
  analytics: {
    googleAnalyticsId: "G-E6HR73GY9H",
  },
  description:
    "A searchable Microsoft 365 Message Center and Roadmap archive for tracking tenant-relevant change announcements, rollout dates, and service updates.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Services",
      href: "/service",
    },
    {
      title: "Roadmap",
      href: "/roadmap",
    },
    {
      title: "Archive",
      href: "/archive",
    },
    {
      title: "About",
      href: "/about",
    },
  ],
  links: {
    permissions: "https://permissions.cengizyilmaz.net",
    tenantFinder: "https://tenant-find.cengizyilmaz.net",
    m365Report: "https://m365report.cengizyilmaz.net",
    portfolio: "https://cengizyilmaz.net",
    parentFeed: "https://cengizyilmaz.net/feed",
    github: "https://github.com/cengizyilmaz1/MSMessageCenter",
    linkedin: "https://linkedin.com/in/cengizyilmazz",
    twitter: "https://x.com/cengizyilmaz_",
  },
}
