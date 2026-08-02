export const SERVICE_PAGE_SIZE: number

export function getPageCount(total: number): number
export function getPerPage(total: number): number
export function getPageSlice<T>(items: T[], page: number): T[]
export function getServicePagePath(serviceSlug: string, page: number): string
export function getPageNumbers(total: number): number[]
