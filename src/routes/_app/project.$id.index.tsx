import { buttonVariants } from "@/components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import type { Package } from "@/lib/types"
import { useSuspenseQuery } from "@tanstack/react-query"
import { projectDetailQueryOptions } from "@/lib/query-options"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export const Route = createFileRoute("/_app/project/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))

  const { project, packages } = projectData

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <Breadcrumbs crumbs={[{ label: "All projects", to: "/all-projects" }]} />
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Project
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {project.name}
        </h1>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">Packages</p>
        <p className="text-sm text-muted-foreground">
          Organize your work into installable units.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          This project does not have any packages yet. Create one to get
          started.
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg: Package) => (
            <div
              key={pkg.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {pkg.name}
                  </p>
                </div>
                <Link
                  to="/package/$id"
                  params={{ id: pkg.id }}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
