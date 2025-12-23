import { Button } from "@/components/ui/button"
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
import { createPackageFn, getProjectWithPackagesFn } from "@/fn"
import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { FormEvent, useEffect, useState } from "react"
import { z } from "zod"

export const Route = createFileRoute("/_app/project/$id")({
  loader: async ({ params }) => {
    return getProjectWithPackagesFn({ data: { projectId: params.id } })
  },
  validateSearch: z.object({
    newPkg: z.boolean().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { project, packages } = Route.useLoaderData()
  const { newPkg } = Route.useSearch()
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()

  const [packageName, setPackageName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedPackageName = packageName.trim()

  useEffect(() => {
    if (!newPkg) {
      setPackageName("")
      setCreateError(null)
      setIsSubmitting(false)
    }
  }, [newPkg])

  const formatDate = (value: string | null) => {
    if (!value) {
      return "—"
    }

    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const closeDrawer = () => {
    navigate({
      to: location.pathname,
      search: (prev) => ({ ...prev, newPkg: false }),
    })
  }

  const handleCreatePackage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedPackageName) {
      setCreateError("Package name is required")
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      await createPackageFn({
        data: { projectId: project.id, name: trimmedPackageName },
      })
      closeDrawer()
      await router.invalidate()
    } catch (error) {
      console.error(error)
      setCreateError(
        error instanceof Error ? error.message : "Unable to create package."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(project.createdAt)}
          </p>
        </div>
        <Button
          onClick={() =>
            navigate({
              to: location.pathname,
              search: (prev) => ({ ...prev, newPkg: true }),
            })
          }
        >
          New package
        </Button>
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
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {pkg.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(pkg.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/package/$id",
                      params: { id: pkg.id },
                    })
                  }
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!newPkg} direction="right" onClose={closeDrawer}>
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
                onChange={(event) => setPackageName(event.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              {createError ? (
                <p className="text-sm text-red-500">{createError}</p>
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
                disabled={isSubmitting || !trimmedPackageName}
              >
                {isSubmitting ? "Creating..." : "Create package"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
