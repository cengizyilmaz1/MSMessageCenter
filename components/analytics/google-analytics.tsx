import Script from "next/script"

import { siteConfig } from "@/config/site"

export function GoogleAnalytics() {
  const measurementId = siteConfig.analytics.googleAnalyticsId

  if (!measurementId || process.env.NODE_ENV !== "production") {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname
          });
        `}
      </Script>
    </>
  )
}
