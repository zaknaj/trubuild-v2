import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { projectDetailQueryOptions } from "@/lib/query-options"

export const Route = createFileRoute("/_app/project/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))

  const { project } = projectData

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
    </div>
  )
}
