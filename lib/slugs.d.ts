export interface MessageSlugSource {
  Id: string
  Title?: string | null
}

export function slugifyTitle(title?: string): string
export function slugifyService(serviceName?: string): string
export function parseMessageIdFromSlug(slug?: string): string
export function getMessageSlug(message: MessageSlugSource): string
export function getCanonicalMessagePath(message: MessageSlugSource): string
export function getCanonicalMessageUrl(
  message: MessageSlugSource,
  siteUrl: string
): string
