import { createFileRoute, Outlet } from "@tanstack/react-router"
import { PackageSidemenu } from "@/components/PackageSidemenu"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app/package/$id")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageMembersQueryOptions(params.id))
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
