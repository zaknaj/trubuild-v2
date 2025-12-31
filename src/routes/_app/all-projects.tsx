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
import { createProjectFn } from "@/fn"
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
} from "@/lib/query-options"
import type { Project } from "@/lib/types"

export const Route = createFileRoute("/_app/all-projects")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(projectsQueryOptions)
    context.queryClient.prefetchQuery(currentUserOrgRoleQueryOptions)
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: projects } = useSuspenseQuery(projectsQueryOptions)
  const { data: userRole } = useSuspenseQuery(currentUserOrgRoleQueryOptions)
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [projectName, setProjectName] = useState("")

  const canCreateProject =
    userRole.role === "owner" || userRole.role === "admin"

  const createProject = useMutation({
    mutationFn: (name: string) => createProjectFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
      closeDrawer()
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
