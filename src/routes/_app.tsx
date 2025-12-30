import { setActiveOrgFn } from "@/fn"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import {
  activeOrgIdQueryOptions,
  orgsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context
    const session = await queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: "/login" })
    }
    const [orgs] = await Promise.all([
      queryClient.ensureQueryData(orgsQueryOptions),
      queryClient.ensureQueryData(activeOrgIdQueryOptions),
    ])
    if (orgs.length === 0) {
      throw redirect({ to: "/login" })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: activeOrg } = useSuspenseQuery(activeOrgIdQueryOptions)
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (orgs.length > 0 && !activeOrg) {
      setActiveOrgFn({ data: { organizationId: orgs[0].id } }).then(() => {
        queryClient.setQueryData(activeOrgIdQueryOptions.queryKey, orgs[0].id)
      })
    }
  }, [orgs, activeOrg, queryClient])

  return (
    <div className="w-screen overflow-hidden h-screen flex flex-col text-sm">
      <Navbar />
      {/* <div
          className="absolute bg-white/20 -top-(--d) left-[calc(var(--p)-var(--d))] h-[calc(100%-var(--p)+var(--d)*2)] 
          w-[calc(100%-(var(--p)-var(--d))*2)] rounded-[calc(var(--r)+var(--d))] border-[0.5px] border-white/30 [box-shadow:0_0_20px_rgba(0,0,0,0.25)]"
        /> */}
      <div className="p-6 overflow-hidden -mt-6 h-full">
        <div className="relative bg-white size-full overflow-auto rounded-lg shadow-[0_0_0_6px_rgba(255,255,255,0.25)] pb-60">
          <Suspense fallback={<div className="p-6">Loading...</div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
