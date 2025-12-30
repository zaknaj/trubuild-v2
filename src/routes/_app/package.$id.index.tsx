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
import { createAssetFn } from "@/fn"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import type { Asset } from "@/lib/types"
import { Settings } from "lucide-react"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { packageDetailQueryOptions } from "@/lib/query-options"

export const Route = createFileRoute("/_app/package/$id/")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      packageDetailQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const queryClient = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [assetName, setAssetName] = useState("")

  const { package: pkg, project, assets } = packageData

  const createAsset = useMutation({
    mutationFn: (name: string) =>
      createAssetFn({ data: { packageId: pkg.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(id).queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setDrawerOpen(false)
    setAssetName("")
    createAsset.reset()
  }

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault()
    const name = assetName.trim()
    if (!name) return
    createAsset.mutate(name)
  }

  return (
    <>
      <div className="p-6 space-y-6 max-w-[600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Package
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {pkg.name}
            </h1>
            <Link
              to="/project/$id"
              params={{ id: project.id }}
              className="text-xs font-medium text-blue-600 underline-offset-4 hover:underline"
            >
              Back to {project.name}
            </Link>
          </div>
          <div className="flex gap-2">
            <Link
              to="/package/$id/settings"
              params={{ id }}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <Settings className="size-4" />
            </Link>
            <Button onClick={() => setDrawerOpen(true)}>New asset</Button>
          </div>
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
            {assets.map((asset: Asset) => (
              <div
                key={asset.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {asset.name}
                    </p>
                  </div>
                  <Link
                    to="/package/$id/comm/$assetId"
                    params={{ id: pkg.id, assetId: asset.id }}
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
            <form className="space-y-6" onSubmit={handleCreateAsset}>
              <DrawerHeader>
                <DrawerTitle>Create asset</DrawerTitle>
                <DrawerDescription>
                  Assets represent individual files, components, or work
                  outputs.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-6 space-y-2">
                <Label htmlFor="asset-name">Asset name</Label>
                <Input
                  id="asset-name"
                  placeholder="Hero section mock"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  disabled={createAsset.isPending}
                  autoFocus
                />
                {createAsset.error ? (
                  <p className="text-sm text-red-500">
                    {createAsset.error instanceof Error
                      ? createAsset.error.message
                      : "Unable to create asset."}
                  </p>
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
                  disabled={createAsset.isPending || !assetName.trim()}
                >
                  {createAsset.isPending ? "Creating..." : "Create asset"}
                </Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}
