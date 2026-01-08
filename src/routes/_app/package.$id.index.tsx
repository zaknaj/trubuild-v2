import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { packageDetailQueryOptions } from "@/lib/query-options"

export const Route = createFileRoute("/_app/package/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))

  const { package: pkg } = packageData

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{pkg.name}</h1>
    </div>
  )
}
