import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { PackageHeader } from "@/components/PackageHeader"
import { PackageSettingsDialog } from "@/components/PackageSettingsDialog"
import { renamePackageFn } from "@/fn"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
  packageAccessQueryOptions,
  projectDetailQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app/package/$id")({
  beforeLoad: async ({ params, context }) => {
    // Check access before loading the route
    try {
      const accessData = await context.queryClient.ensureQueryData(
        packageAccessQueryOptions(params.id)
      )
      if (accessData.access === "none") {
        throw redirect({ to: "/" })
      }
    } catch (error) {
      // If access check fails (e.g., package not found), redirect to home
      if (error instanceof Error && !("to" in error)) {
        throw redirect({ to: "/" })
      }
      throw error
    }
  },
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageMembersQueryOptions(params.id))
    // Access already checked in beforeLoad, but prefetch for component use
    context.queryClient.prefetchQuery(packageAccessQueryOptions(params.id))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(id))
  const { data: accessData } = useSuspenseQuery(packageAccessQueryOptions(id))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<
    "general" | "members" | "activity"
  >("general")

  const canEdit = accessData.access === "full"
  const canViewTechnical =
    accessData.access === "full" || accessData.access === "technical"
  const canViewCommercial =
    accessData.access === "full" || accessData.access === "commercial"

  const renamePackage = useMutation({
    mutationFn: (name: string) =>
      renamePackageFn({ data: { packageId: id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(id).queryKey,
      })
      // Also update sidebar (packages are shown via project detail)
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(data.project.id).queryKey,
      })
    },
  })

  const openSettings = (
    tab: "general" | "members" | "activity" = "general"
  ) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  const outlet = useMemo(() => <Outlet />, [id])

  return (
    <>
      <PackageHeader
        packageId={id}
        title={data.package.name}
        onTitleChange={
          canEdit ? (name) => renamePackage.mutate(name) : undefined
        }
        onSettingsClick={canEdit ? () => openSettings("general") : undefined}
        onActivityClick={canEdit ? () => openSettings("activity") : undefined}
        members={canEdit ? members : undefined}
        onMembersClick={canEdit ? () => openSettings("members") : undefined}
        canViewTechnical={canViewTechnical}
        canViewCommercial={canViewCommercial}
      />
      <div className="flex-1 overflow-hidden">{outlet}</div>
      {canEdit && (
        <PackageSettingsDialog
          packageId={id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
      )}
    </>
  )
}
