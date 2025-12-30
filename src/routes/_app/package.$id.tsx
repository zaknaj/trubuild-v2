import { createFileRoute, Outlet } from "@tanstack/react-router"
import { PackageSidemenu } from "@/components/PackageSidemenu"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app/package/$id")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      packageDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      packageMembersQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    <>
      <PackageSidemenu packageId={id} />
      <Outlet />
    </>
  )
}
