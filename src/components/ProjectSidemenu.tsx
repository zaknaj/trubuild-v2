import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { SettingsIcon, BoxIcon, PlusIcon, FolderOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MemberDisplay } from "@/components/MemberDisplay"
import { ProjectSettingsDialog } from "@/components/ProjectSettingsDialog"
import { createPackageFn } from "@/fn"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
  projectMembersQueryOptions,
} from "@/lib/query-options"
import type { Member, Package } from "@/lib/types"

const STAGES = [
  "PQQ Release",
  "PQQ Submitted",
  "PQQ Evaluation & Shortlisting",
  "ITT Release",
  "Tender Submitted",
  "Tender Evaluation Completion",
  "Contract Award",
  "Contract Execution",
] as const

const RAG_STATUSES = [
  { label: "On track", color: "bg-green-500" },
  { label: "At risk", color: "bg-amber-500" },
  { label: "Off track", color: "bg-red-500" },
] as const

export function ProjectSidemenu({ projectId }: { projectId: string }) {
  const { data: projectData } = useSuspenseQuery(
    projectDetailQueryOptions(projectId)
  )
  const { data: accessData } = useSuspenseQuery(
    projectAccessQueryOptions(projectId)
  )
  const { data: members } = useSuspenseQuery(
    projectMembersQueryOptions(projectId)
  )
  const queryClient = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [packageName, setPackageName] = useState("")
  const [stage, setStage] = useState<(typeof STAGES)[number]>(STAGES[0])
  const [ragStatus, setRagStatus] = useState<(typeof RAG_STATUSES)[number]>(
    RAG_STATUSES[0]
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<
    "general" | "members"
  >("general")

  const { project, packages } = projectData
  const canCreatePackage = accessData.access === "full"

  const leadMembers = members.filter((m: Member) => m.role === "project_lead")
  const otherMembers = members.filter(
    (m: Member) => m.role === "commercial_lead" || m.role === "technical_lead"
  )

  const createPackage = useMutation({
    mutationFn: (name: string) =>
      createPackageFn({ data: { projectId: project.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setDrawerOpen(false)
    setPackageName("")
    createPackage.reset()
  }

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault()
    const name = packageName.trim()
    if (!name) return
    createPackage.mutate(name)
  }

  const openSettingsGeneral = () => {
    setSettingsDefaultTab("general")
    setSettingsOpen(true)
  }

  const openSettingsMembers = () => {
    setSettingsDefaultTab("members")
    setSettingsOpen(true)
  }

  return (
    <>
      <div className="w-85 border-r shrink-0 py-6 pl-9 overflow-auto">
        <div className="flex items-center mb-4 group gap-1">
          <div className="text-18 font-medium">{project.name}</div>
          <Button
            variant="ghost"
            className="group-hover:opacity-100 opacity-0 text-black/30 hover:text-black"
            onClick={openSettingsGeneral}
          >
            <SettingsIcon size="16" />
          </Button>
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Project</div>
          <Button variant="ghost" className="text-12 font-medium">
            <FolderOpenIcon />
            {project.name}
          </Button>
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">RAG Status</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-12 font-medium gap-2">
                <span className={`size-1.5 rounded-full ${ragStatus.color}`} />
                {ragStatus.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-fit text-12 font-medium"
            >
              {RAG_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status.label}
                  onClick={() => setRagStatus(status)}
                  className="gap-2"
                >
                  <span className={`size-1.5 rounded-full ${status.color}`} />
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Stage</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-12 font-medium">
                {stage}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-fit text-12 font-medium"
            >
              {STAGES.map((s) => (
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  key={s}
                  onClick={() => setStage(s)}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Project lead</div>
          <MemberDisplay members={leadMembers} onClick={openSettingsMembers} />
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Members</div>
          <MemberDisplay members={otherMembers} onClick={openSettingsMembers} />
        </div>

        <div className="text-11 text-muted-foreground mt-10 mb-3">Packages</div>
        <div className="flex flex-col items-baseline -ml-3 pr-8">
          {canCreatePackage && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-12 text-green-700 font-medium flex gap-2 h-8 items-center hover:bg-accent w-full rounded px-3"
            >
              <PlusIcon size="16" />
              New package
            </button>
          )}
          {packages.map((pkg: Package) => (
            <Link
              key={pkg.id}
              to="/package/$id"
              params={{ id: pkg.id }}
              className="text-12 font-medium flex gap-2 h-8 items-center hover:bg-accent w-full rounded px-3"
            >
              <BoxIcon size="16" />
              {pkg.name}
            </Link>
          ))}
        </div>

        <div className="text-11 text-muted-foreground mt-10 mb-4">Activity</div>
        <div className="flex flex-col gap-3 pr-8">
          <div className="w-full h-5 bg-black/3 rounded"></div>
          <div className="w-full h-5 bg-black/3 rounded"></div>
          <div className="w-full h-5 bg-black/3 rounded"></div>
          <div className="w-full h-5 bg-black/3 rounded"></div>
        </div>
      </div>

      <Drawer open={drawerOpen} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreatePackage}>
            <DrawerHeader>
              <DrawerTitle>Create package</DrawerTitle>
              <DrawerDescription>
                Packages live inside your project and gather related assets.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="package-name">Package name</Label>
              <Input
                id="package-name"
                placeholder="Landing pages"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                disabled={createPackage.isPending}
                autoFocus
              />
              {createPackage.error ? (
                <p className="text-sm text-red-500">
                  {createPackage.error instanceof Error
                    ? createPackage.error.message
                    : "Unable to create package."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick something descriptive so your teammates know what this
                  package holds.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={createPackage.isPending || !packageName.trim()}
              >
                {createPackage.isPending ? "Creating..." : "Create package"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <ProjectSettingsDialog
        projectId={projectId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsDefaultTab}
      />
    </>
  )
}
