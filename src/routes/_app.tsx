import { setActiveOrgFn } from "@/fn"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import {
  authBootstrapQueryOptions,
  orgsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context
    const { session, orgs } = await queryClient.ensureQueryData(
      authBootstrapQueryOptions
    )

    // Prime the individual caches so components using these queryOptions
    // don't immediately refetch.
    queryClient.setQueryData(sessionQueryOptions.queryKey, session)
    queryClient.setQueryData(orgsQueryOptions.queryKey, orgs)

    if (!session || orgs.length === 0) {
      throw redirect({ to: "/login" })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const queryClient = useQueryClient()
  const activeOrgId = session?.session?.activeOrganizationId

  useEffect(() => {
    if (orgs.length > 0 && !activeOrgId) {
      setActiveOrgFn({ data: { organizationId: orgs[0].id } }).then(() => {
        queryClient.invalidateQueries({
          queryKey: sessionQueryOptions.queryKey,
        })
      })
    }
  }, [orgs, activeOrgId, queryClient])

  return (
    <div className="w-screen overflow-hidden h-screen flex flex-col text-sm">
      <Navbar />
      {/* <div
          className="absolute bg-white/20 -top-(--d) left-[calc(var(--p)-var(--d))] h-[calc(100%-var(--p)+var(--d)*2)] 
          w-[calc(100%-(var(--p)-var(--d))*2)] rounded-[calc(var(--r)+var(--d))] border-[0.5px] border-white/30 [box-shadow:0_0_20px_rgba(0,0,0,0.25)]"
        /> */}
      <div className="bg-white h-full overflow-auto max-h-full">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
