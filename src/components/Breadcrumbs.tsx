import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

export type Crumb = {
  label: string
  to: string
  params?: Record<string, string>
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5" />}
          <Link
            to={crumb.to}
            params={crumb.params}
            className="hover:text-slate-900 hover:underline underline-offset-4"
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

