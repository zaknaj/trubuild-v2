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
import { createPackageFn } from "@/fn"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import type { Package } from "@/lib/types"
import { Settings } from "lucide-react"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
} from "@/lib/query-options"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/project/$id/")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      projectDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      projectAccessQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))
  const { data: accessData } = useSuspenseQuery(projectAccessQueryOptions(id))
  const queryClient = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [packageName, setPackageName] = useState("")

  const { project, packages } = projectData
  const canCreatePackage = accessData.access === "full"

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

  return (
    <>
      <PageSidebar>
        <div className="font-medium">project</div>
      </PageSidebar>
      <div className="p-6 space-y-6 max-w-[600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Project
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {project.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/project/$id/settings"
              params={{ id }}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <Settings className="size-4" />
            </Link>
            {canCreatePackage && (
              <Button onClick={() => setDrawerOpen(true)}>New package</Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Packages</p>
          <p className="text-sm text-muted-foreground">
            Organize your work into installable units.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
            This project does not have any packages yet. Create one to get
            started.
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg: Package) => (
              <div
                key={pkg.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {pkg.name}
                    </p>
                  </div>
                  <Link
                    to="/package/$id"
                    params={{ id: pkg.id }}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

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
      </div>
    </>
  )
}
