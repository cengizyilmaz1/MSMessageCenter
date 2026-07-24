import { slugifyService } from "./slugs.mjs"

export function findServiceBySlug(slug: string, allServices: string[]): string | undefined {
  return allServices.find(s => slugifyService(s) === slug)
}

export function formatCategoryLabel(category: string | undefined): string {
  if (!category) return "Uncategorized"
  const labels: Record<string, string> = {
    planForChange: "Plan for change",
    stayInformed: "Stay informed",
    roadmap: "Roadmap",
  }
  return labels[category] ?? category
}
