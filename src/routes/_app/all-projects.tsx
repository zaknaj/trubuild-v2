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
import { FormEvent, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { RouterContext } from "@/router"
import { projectsQueryOptions } from "@/lib/query-options"

export const Route = createFileRoute("/_app/all-projects")({
  loader: ({ context }) => {
    const { queryClient } = context as RouterContext
    void queryClient.ensureQueryData(projectsQueryOptions)
  },
  component: RouteComponent,
})

type Project = {
  id: string
  name: string
  createdAt: string | null
  updatedAt: string | null
  userId: string
  organizationId: string
}

function RouteComponent() {
  const { data: projects = [] } = useQuery(projectsQueryOptions)
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const closeDrawer = () => {
    setIsOpen(false)
    setProjectName("")
    setError(null)
  }

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = projectName.trim()
    if (!name) {
      setError("Project name is required")
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      await createProjectFn({ data: { name } })
      closeDrawer()
      await queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project.")
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—"

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">All projects</h1>
          <p className="text-sm text-muted-foreground">Projects in your active organization.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>New project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          You do not have any projects yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project: Project) => (
            <div key={project.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">{project.name}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(project.createdAt)}</p>
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
              <DrawerDescription>Create a new project for your organization.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="Project Nova"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isCreating}
                autoFocus
              />
              {error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Projects are created inside your active organization.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={isCreating || !projectName.trim()}>
                {isCreating ? "Creating..." : "Create project"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
