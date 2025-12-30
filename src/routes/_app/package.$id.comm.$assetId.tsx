import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { packageDetailQueryOptions } from "@/lib/query-options"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export const Route = createFileRoute("/_app/package/$id/comm/$assetId")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))

  const { package: pkg, project } = packageData

  return (
    <div className="p-6 max-w-[600px] mx-auto">
      <Breadcrumbs
        crumbs={[
          { label: "All projects", to: "/all-projects" },
          { label: project.name, to: "/project/$id", params: { id: project.id } },
          { label: pkg.name, to: "/package/$id", params: { id } },
          { label: "Commercial Analysis", to: "/package/$id/comm", params: { id } },
        ]}
      />
      Hello "/_app/package/$id/comm/$assetId"!
    </div>
  )
}
