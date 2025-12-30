import { buttonVariants } from "@/components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import type { Asset } from "@/lib/types"
import { useSuspenseQuery } from "@tanstack/react-query"
import { packageDetailQueryOptions } from "@/lib/query-options"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export const Route = createFileRoute("/_app/package/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))

  const { package: pkg, assets, project } = packageData

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <Breadcrumbs
        crumbs={[
          { label: "All projects", to: "/all-projects" },
          {
            label: project.name,
            to: "/project/$id",
            params: { id: project.id },
          },
        ]}
      />
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Package
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">{pkg.name}</h1>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">Assets</p>
        <p className="text-sm text-muted-foreground">
          Files, components, or other deliverables bundled in this package.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          No assets yet. Create one to start collaborating on this package.
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset: Asset) => (
            <div
              key={asset.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {asset.name}
                  </p>
                </div>
                <Link
                  to="/package/$id/comm/$assetId"
                  params={{ id: pkg.id, assetId: asset.id }}
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
