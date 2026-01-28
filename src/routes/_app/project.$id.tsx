import { useMemo, useState } from "react"
import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { BoxIcon, PlusIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProjectHeader } from "@/components/ProjectHeader"
import { ProjectSettingsDialog } from "@/components/ProjectSettingsDialog"
import { createPackageFn, renameProjectFn } from "@/fn"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
  projectMembersQueryOptions,
  projectsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"
import { getCurrencyForCountry } from "@/lib/countries"
import { CurrencySelect } from "@/components/CurrencySelect"
import { SidebarMembersSection } from "@/components/SidebarMembersSection"
// import { PROCUREMENT_STAGES, RAG_STATUSES } from "@/lib/constants"

type PackageWithAssetCount = {
  id: string
  name: string
  currency: string | null
  // stage: string | null
  // ragStatus: string | null
  projectId: string
  assetCount: number
  awardedContractorId: string | null
  awardedContractorName: string | null
}

export const Route = createFileRoute("/_app/project/$id")({
  beforeLoad: async ({ params, context }) => {
    // Check access before loading the route
    try {
      const accessData = await context.queryClient.ensureQueryData(
        projectAccessQueryOptions(params.id)
      )
      if (accessData.access === "none") {
        throw redirect({ to: "/" })
      }
    } catch (error) {
      // If access check fails (e.g., project not found), redirect to home
      if (error instanceof Error && !("to" in error)) {
        throw redirect({ to: "/" })
      }
      throw error
    }
  },
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(projectDetailQueryOptions(params.id))
    // Access already checked in beforeLoad, but prefetch for component use
    context.queryClient.prefetchQuery(projectAccessQueryOptions(params.id))
    context.queryClient.prefetchQuery(projectMembersQueryOptions(params.id))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))
  const { data: accessData } = useSuspenseQuery(projectAccessQueryOptions(id))
  const { data: members } = useSuspenseQuery(projectMembersQueryOptions(id))
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<
    "general" | "members" | "activity"
  >("general")

  const { project, packages } = projectData

  // Users with only package-level access should not see project settings/members/activity
  const hasProjectLevelAccess = accessData.hasProjectLevelAccess

  // Default currency based on project's country
  const defaultCurrency = getCurrencyForCountry(project.country ?? "") ?? "USD"

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [packageName, setPackageName] = useState("")
  const [packageCurrency, setPackageCurrency] = useState(defaultCurrency)
  const [technicalWeight, setTechnicalWeight] = useState(50)

  const canCreatePackage = accessData.access === "full"

  const renameProject = useMutation({
    mutationFn: (name: string) =>
      renameProjectFn({ data: { projectId: project.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      // Also update sidebar
      queryClient.invalidateQueries({
        queryKey: projectsQueryOptions.queryKey,
      })
    },
  })

  const createPackage = useMutation({
    mutationFn: ({
      name,
      currency,
      technicalWeight,
      commercialWeight,
    }: {
      name: string
      currency: string
      technicalWeight: number
      commercialWeight: number
    }) =>
      createPackageFn({
        data: {
          projectId: project.id,
          name,
          currency,
          technicalWeight,
          commercialWeight,
        },
      }),
    onSuccess: (newPackage) => {
      // Invalidate project detail to show new package
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      // Also invalidate sidebar projects list (shows package counts)
      queryClient.invalidateQueries({
        queryKey: projectsQueryOptions.queryKey,
      })
      closeDrawer()
      // Navigate to the new package's contractors page with add contractor sheet open
      navigate({
        to: "/package/$id/contractors",
        params: { id: newPackage.id },
        search: { addContractor: true },
      })
    },
  })

  const closeDrawer = () => {
    setDrawerOpen(false)
    setPackageName("")
    setPackageCurrency(defaultCurrency)
    setTechnicalWeight(50)
    createPackage.reset()
  }

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault()
    const name = packageName.trim()
    if (!name) return
    createPackage.mutate({
      name,
      currency: packageCurrency,
      technicalWeight,
      commercialWeight: 100 - technicalWeight,
    })
  }

  const openSettings = (
    tab: "general" | "members" | "activity" = "general"
  ) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  const packagesList = useMemo(() => {
    if (packages.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted-foreground">
          No packages yet. Create one to get started.
        </div>
      )
    }

    return (
      <div className="border rounded-lg divide-y">
        {packages.map((pkg: PackageWithAssetCount) => (
          <Link
            key={pkg.id}
            to="/package/$id"
            params={{ id: pkg.id }}
            className={`group flex flex-col px-3 py-2.5 hover:bg-muted/50 transition-colors ${
              pkg.awardedContractorName ? "bg-green-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <BoxIcon size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-sm truncate">{pkg.name}</span>
                {/* {pkg.ragStatus &&
                  (() => {
                    const rag = RAG_STATUSES.find(
                      (r) => r.value === pkg.ragStatus
                    )
                    return rag ? (
                      <span
                        className={`size-2 rounded-full ${rag.color}`}
                        title={`Status: ${rag.label}`}
                      />
                    ) : null
                  })()} */}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {pkg.assetCount} {pkg.assetCount === 1 ? "asset" : "assets"}
                </span>
                {/* {pkg.stage && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {PROCUREMENT_STAGES.find((s) => s.value === pkg.stage)
                      ?.label ?? pkg.stage}
                  </Badge>
                )} */}
                <ChevronRightIcon
                  size={14}
                  className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
                />
              </div>
            </div>
            {pkg.awardedContractorName && (
              <div className="ml-7 mt-1 text-xs text-green-700">
                Awarded to {pkg.awardedContractorName}
              </div>
            )}
          </Link>
        ))}
      </div>
    )
  }, [packages])

  return (
    <>
      <ProjectHeader
        title={project.name}
        onTitleChange={
          hasProjectLevelAccess
            ? (name) => renameProject.mutate(name)
            : undefined
        }
        onSettingsClick={
          hasProjectLevelAccess ? () => openSettings("general") : undefined
        }
        onActivityClick={
          hasProjectLevelAccess ? () => openSettings("activity") : undefined
        }
        members={hasProjectLevelAccess ? members : undefined}
        onMembersClick={
          hasProjectLevelAccess ? () => openSettings("members") : undefined
        }
      />
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Side menu */}
        {hasProjectLevelAccess && (
          <div className="w-72 bg-white pb-4 px-[28px] overflow-auto space-y-6 border-r-[0.5px] border-black/15">
            {/* Title */}
            <h2 className="text-[16px] font-semibold text-gradient my-8 w-fit">
              Project summary
            </h2>
            {/* Members */}
            <SidebarMembersSection
              members={members}
              type="project"
              canEdit={true}
              onManageClick={() => openSettings("members")}
              currentUserId={session?.user?.id}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[600px] mx-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Packages
              </h2>
              {canCreatePackage && (
                <Button
                  onClick={() => setDrawerOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon size={14} />
                  New package
                </Button>
              )}
            </div>

            {packagesList}
          </div>
        </div>
      </div>

      {hasProjectLevelAccess && (
        <ProjectSettingsDialog
          projectId={id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
      )}

      <Sheet open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="min-w-[500px] sm:max-w-none">
          <form className="space-y-6" onSubmit={handleCreatePackage}>
            <SheetHeader>
              <SheetTitle>Create package</SheetTitle>
              <SheetDescription>
                Packages live inside your project and gather related assets.
              </SheetDescription>
            </SheetHeader>
            <div className="px-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="package-name">Package name</Label>
                <Input
                  id="package-name"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  disabled={createPackage.isPending}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <CurrencySelect
                  value={packageCurrency}
                  onValueChange={setPackageCurrency}
                  disabled={createPackage.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Score weighting</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">
                      Technical
                    </span>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={technicalWeight}
                        onChange={(e) => {
                          const val = Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                          setTechnicalWeight(val)
                        }}
                        disabled={createPackage.isPending}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">
                      Commercial
                    </span>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={100 - technicalWeight}
                        onChange={(e) => {
                          const val = Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                          setTechnicalWeight(100 - val)
                        }}
                        disabled={createPackage.isPending}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {createPackage.error && (
                <p className="text-sm text-red-500">
                  {createPackage.error instanceof Error
                    ? createPackage.error.message
                    : "Unable to create package."}
                </p>
              )}
            </div>
            <SheetFooter>
              <Button
                type="submit"
                disabled={createPackage.isPending || !packageName.trim()}
              >
                {createPackage.isPending ? "Creating..." : "Create package"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
