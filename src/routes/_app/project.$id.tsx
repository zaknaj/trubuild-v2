import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ProjectSidemenu } from "@/components/ProjectSidemenu"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
  projectMembersQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app/project/$id")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      projectDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      projectAccessQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      projectMembersQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    <>
      <ProjectSidemenu projectId={id} />
      <Outlet />
    </>
  )
}
