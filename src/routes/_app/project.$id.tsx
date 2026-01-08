import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ProjectSidemenu } from "@/components/ProjectSidemenu"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
  projectMembersQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app/project/$id")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(projectDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(projectAccessQueryOptions(params.id))
    context.queryClient.prefetchQuery(projectMembersQueryOptions(params.id))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    <div className="flex h-full w-full ring">
      <ProjectSidemenu projectId={id} />
      <Outlet />
    </div>
  )
}
