/**
 * @typedef {{ Id: string, Title?: string | null }} MessageSlugSource
 */

export function slugifyTitle(title = "") {
  return String(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[''"]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function slugifyService(serviceName = "") {
  return slugifyTitle(serviceName)
}

export function parseMessageIdFromSlug(slug = "") {
  const match = String(slug).match(/^(mc|rm)\d+/i)
  return match ? match[0].toUpperCase() : String(slug).toUpperCase()
}

/**
 * @param {MessageSlugSource} message
 */
export function getMessageSlug(message) {
  const id = String(message.Id ?? "").toLowerCase()
  const titleSlug = slugifyTitle(message.Title ?? "")

  return titleSlug ? `${id}-${titleSlug}` : id
}

/**
 * @param {MessageSlugSource} message
 */
export function getCanonicalMessagePath(message) {
  const id = String(message.Id ?? "")
  if (/^RM/i.test(id)) {
    return `/roadmap/${getMessageSlug(message)}`
  }
  return `/message/${getMessageSlug(message)}`
}

/**
 * @param {MessageSlugSource} message
 * @param {string} siteUrl
 */
export function getCanonicalMessageUrl(message, siteUrl) {
  return `${siteUrl.replace(/\/$/, "")}${getCanonicalMessagePath(message)}`
}
