import { setActiveOrgFn } from "@/fn"
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import {
  activeOrgIdQueryOptions,
  orgsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"
import { SidebarProvider, useSidebarContent } from "@/components/SidebarContext"

export const Route = createFileRoute("/_app")({
  loader: async ({ context, location }) => {
    const { queryClient } = context
    // Session check must await for auth redirect
    const session = await queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: "/login" })
    }
    // Await orgs and activeOrg to prevent hydration mismatch in Navbar
    const [orgs] = await Promise.all([
      queryClient.ensureQueryData(orgsQueryOptions),
      queryClient.ensureQueryData(activeOrgIdQueryOptions),
    ])
    // Redirect to create-org if user has no orgs (unless already on create-org page)
    if (orgs.length === 0 && location.pathname !== "/create-org") {
      throw redirect({ to: "/create-org" })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const location = useLocation()
  const { data: activeOrg } = useSuspenseQuery(activeOrgIdQueryOptions)
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const queryClient = useQueryClient()
  const isCreateOrgPage = location.pathname === "/create-org"
  const shouldHideNavbar = isCreateOrgPage && orgs.length === 0

  // Auto-set first org as active if needed
  useEffect(() => {
    if (orgs.length > 0 && !activeOrg) {
      setActiveOrgFn({ data: { organizationId: orgs[0].id } }).then(() => {
        queryClient.setQueryData(activeOrgIdQueryOptions.queryKey, orgs[0].id)
      })
    }
  }, [orgs, activeOrg, queryClient])

  // Create-org page has its own layout
  if (isCreateOrgPage) {
    return (
      <div className="w-full h-screen flex flex-col text-sm">
        {!shouldHideNavbar && <Navbar />}
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <Outlet />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col text-sm">
      <Navbar />
      <div className="size-full [--p:24px] [--r:12px] [--d:6px] p-(--p) pt-0 flex-1 relative">
        <div
          className="absolute bg-white/20 -top-(--d) left-[calc(var(--p)-var(--d))] h-[calc(100%-var(--p)+var(--d)*2)] 
          w-[calc(100%-(var(--p)-var(--d))*2)] rounded-[calc(var(--r)+var(--d))] border-[0.5px] border-white/30 [box-shadow:0_0_20px_rgba(0,0,0,0.25)]"
        />
        <div className="relative bg-white rounded-(--r) size-full overflow-auto">
          <SidebarProvider>
            <FloatingSidebar />
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <Outlet />
            </Suspense>
          </SidebarProvider>
        </div>
      </div>
    </div>
  )
}

function FloatingSidebar() {
  const { content } = useSidebarContent()
  if (!content) return null

  return (
    <div className="absolute left-0 top-0 h-full w-48 z-10 pointer-events-none">
      <div className="h-full p-4 pointer-events-auto">
        <div className="h-full rounded-lg bg-slate-900/5 backdrop-blur-sm border border-slate-200/50 p-3 text-sm text-slate-600">
          {content}
        </div>
      </div>
    </div>
  )
}
