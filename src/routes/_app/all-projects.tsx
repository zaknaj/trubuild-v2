import { Button, buttonVariants } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createProjectFn, restoreProjectFn, restorePackageFn } from "@/fn"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  projectsQueryOptions,
  currentUserOrgRoleQueryOptions,
  archivedProjectsQueryOptions,
  archivedPackagesQueryOptions,
  queryKeys,
} from "@/lib/query-options"
import type { Project } from "@/lib/types"
import { RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_app/all-projects")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(projectsQueryOptions)
    context.queryClient.prefetchQuery(currentUserOrgRoleQueryOptions)
    context.queryClient.prefetchQuery(archivedProjectsQueryOptions)
    context.queryClient.prefetchQuery(archivedPackagesQueryOptions)
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: projects } = useSuspenseQuery(projectsQueryOptions)
  const { data: userRole } = useSuspenseQuery(currentUserOrgRoleQueryOptions)
  const { data: archivedProjects } = useSuspenseQuery(archivedProjectsQueryOptions)
  const { data: archivedPackages } = useSuspenseQuery(archivedPackagesQueryOptions)
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null)
  const [restoringPackageId, setRestoringPackageId] = useState<string | null>(null)

  const canCreateProject =
    userRole.role === "owner" || userRole.role === "admin"

  const hasArchivedItems = archivedProjects.length > 0 || archivedPackages.length > 0

  const createProject = useMutation({
    mutationFn: (name: string) => createProjectFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
      closeDrawer()
    },
  })

  const restoreProject = useMutation({
    mutationFn: (projectId: string) => restoreProjectFn({ data: { projectId } }),
    onSuccess: () => {
      toast.success("Project restored")
      queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: archivedProjectsQueryOptions.queryKey })
      setRestoringProjectId(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to restore project")
      setRestoringProjectId(null)
    },
  })

  const restorePackage = useMutation({
    mutationFn: ({ packageId, projectId }: { packageId: string; projectId: string }) =>
      restorePackageFn({ data: { packageId } }),
    onSuccess: (_, { projectId }) => {
      toast.success("Package restored")
      queryClient.invalidateQueries({ queryKey: archivedPackagesQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: queryKeys.project.detail(projectId) })
      setRestoringPackageId(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to restore package")
      setRestoringPackageId(null)
    },
  })

  const closeDrawer = () => {
    setIsOpen(false)
    setProjectName("")
    createProject.reset()
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const name = projectName.trim()
    if (!name) return
    createProject.mutate(name)
  }

  const handleRestoreProject = (projectId: string) => {
    setRestoringProjectId(projectId)
    restoreProject.mutate(projectId)
  }

  const handleRestorePackage = (packageId: string, projectId: string) => {
    setRestoringPackageId(packageId)
    restorePackage.mutate({ packageId, projectId })
  }

  return (
    <>
      <div className="p-6 space-y-6 mx-auto w-160">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              All projects
            </h1>
            <p className="text-sm text-muted-foreground">
              Projects in your active organization.
            </p>
          </div>
          {canCreateProject && (
            <Button onClick={() => setIsOpen(true)} variant="primary">
              New project
            </Button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
            You do not have any projects yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project: Project) => (
              <div
                key={project.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {project.name}
                    </p>
                  </div>
                  <Link
                    to="/project/$id"
                    params={{ id: project.id }}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived Section */}
        {hasArchivedItems && (
          <div className="space-y-4 pt-6 border-t">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Archived</h2>
              <p className="text-sm text-muted-foreground">
                Projects and packages that have been archived.
              </p>
            </div>

            <Tabs defaultValue="projects">
              <TabsList>
                <TabsTrigger value="projects">
                  Projects ({archivedProjects.length})
                </TabsTrigger>
                <TabsTrigger value="packages">
                  Packages ({archivedPackages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-4">
                {archivedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No archived projects.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {archivedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-700">
                              {project.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Archived {project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreProject(project.id)}
                            disabled={restoringProjectId === project.id}
                            className="gap-1.5"
                          >
                            {restoringProjectId === project.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="packages" className="mt-4">
                {archivedPackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No archived packages.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {archivedPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-700">
                              {pkg.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              From project: {pkg.projectName} · Archived {pkg.archivedAt ? new Date(pkg.archivedAt).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestorePackage(pkg.id, pkg.projectId)}
                            disabled={restoringPackageId === pkg.id}
                            className="gap-1.5"
                          >
                            {restoringPackageId === pkg.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Drawer open={isOpen} direction="right" onClose={closeDrawer}>
          <DrawerContent className="min-w-[500px]">
            <form className="space-y-6" onSubmit={handleCreate}>
              <DrawerHeader>
                <DrawerTitle>Create Project</DrawerTitle>
                <DrawerDescription>
                  Create a new project for your organization.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-6 space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="Project Nova"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={createProject.isPending}
                  autoFocus
                />
                {createProject.error ? (
                  <p className="text-sm text-red-500">
                    {createProject.error instanceof Error
                      ? createProject.error.message
                      : "Unable to create project."}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Projects are created inside your active organization.
                  </p>
                )}
              </div>
              <DrawerFooter>
                <Button
                  type="submit"
                  disabled={createProject.isPending || !projectName.trim()}
                >
                  {createProject.isPending ? "Creating..." : "Create project"}
                </Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}
