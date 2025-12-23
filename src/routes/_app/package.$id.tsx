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
import { createAssetFn, getPackageWithAssetsFn } from "@/fn"
import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { FormEvent, useEffect, useState } from "react"
import { z } from "zod"

export const Route = createFileRoute("/_app/package/$id")({
  loader: async ({ params }) => {
    return getPackageWithAssetsFn({ data: { packageId: params.id } })
  },
  validateSearch: z.object({
    newAsset: z.boolean().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { package: pkg, project, assets } = Route.useLoaderData()
  const { newAsset } = Route.useSearch()
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()

  const [assetName, setAssetName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedAssetName = assetName.trim()

  useEffect(() => {
    if (!newAsset) {
      setAssetName("")
      setCreateError(null)
      setIsSubmitting(false)
    }
  }, [newAsset])

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
      search: (prev) => ({ ...prev, newAsset: false }),
    })
  }

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedAssetName) {
      setCreateError("Asset name is required")
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      await createAssetFn({
        data: { packageId: pkg.id, name: trimmedAssetName },
      })
      closeDrawer()
      await router.invalidate()
    } catch (error) {
      console.error(error)
      setCreateError(
        error instanceof Error ? error.message : "Unable to create asset."
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
            Package
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">{pkg.name}</h1>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(pkg.createdAt)}
          </p>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 underline-offset-4 hover:underline"
            onClick={() =>
              navigate({
                to: "/project/$id",
                params: { id: project.id },
              })
            }
          >
            Back to {project.name}
          </button>
        </div>
        <Button
          onClick={() =>
            navigate({
              to: location.pathname,
              search: (prev) => ({ ...prev, newAsset: true }),
            })
          }
        >
          New asset
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">Assets</p>
        <p className="text-sm text-muted-foreground">
          Files, components, or other deliverables bundled in this package.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          No assets yet. Create one to start collaborating on this package.
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {asset.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(asset.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/package/$id/comm/$assetId",
                      params: { id: pkg.id, assetId: asset.id },
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

      <Drawer open={!!newAsset} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreateAsset}>
            <DrawerHeader>
              <DrawerTitle>Create asset</DrawerTitle>
              <DrawerDescription>
                Assets represent individual files, components, or work outputs.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="asset-name">Asset name</Label>
              <Input
                id="asset-name"
                placeholder="Hero section mock"
                value={assetName}
                onChange={(event) => setAssetName(event.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              {createError ? (
                <p className="text-sm text-red-500">{createError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A clear name helps everyone understand what this asset
                  contains.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={isSubmitting || !trimmedAssetName}
              >
                {isSubmitting ? "Creating..." : "Create asset"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
