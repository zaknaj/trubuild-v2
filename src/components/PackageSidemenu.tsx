import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Settings, Wrench, ReceiptText, FileBox, Plus } from "lucide-react"
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
import { Sidemenu } from "@/components/Sidemenu"
import { MemberDisplay } from "@/components/MemberDisplay"
import { createAssetFn } from "@/fn"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"
import type { Asset } from "@/lib/types"

type PackageMember = {
  id: string
  role: string
  userId: string | null
  email: string
  userName: string | null
  userImage: string | null
}

export function PackageSidemenu({ packageId }: { packageId: string }) {
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(packageId))
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(packageId))
  const queryClient = useQueryClient()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [assetName, setAssetName] = useState("")

  const { package: pkg, project, assets } = packageData

  // Check if we're on tech or comm pages
  const isTechActive = currentPath === `/package/${packageId}/tech`
  const isCommActive = currentPath === `/package/${packageId}/comm` || currentPath.startsWith(`/package/${packageId}/comm/`)

  const leadMembers = members.filter((m: PackageMember) => m.role === "package_lead")
  const otherMembers = members.filter(
    (m: PackageMember) => m.role === "commercial_team" || m.role === "technical_team"
  )

  const createAsset = useMutation({
    mutationFn: (name: string) =>
      createAssetFn({ data: { packageId: pkg.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(pkg.id).queryKey,
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
      <Sidemenu>
      <div className="p-4 space-y-6">
        {/* Back link */}
        <Link
          to="/project/$id"
          params={{ id: project.id }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {project.name}
        </Link>

        {/* Package header */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 leading-tight">
            {pkg.name}
          </h2>
          <Link
            to="/package/$id/settings"
            params={{ id: packageId }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
          >
            <Settings className="size-4" />
          </Link>
        </div>

        {/* Lead members */}
        <MemberDisplay
          members={leadMembers}
          href={`/package/${packageId}/settings`}
          label="Lead"
        />

        {/* Other members */}
        <MemberDisplay
          members={otherMembers}
          href={`/package/${packageId}/settings`}
          label="Members"
        />

        {/* Analysis sections */}
        <div className="space-y-1">
          {/* Technical Analysis */}
          <Link
            to="/package/$id/tech"
            params={{ id: packageId }}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm font-medium transition-colors ${
              isTechActive
                ? "bg-slate-100 text-slate-900"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
            }`}
          >
            <Wrench className="size-4" />
            Technical Analysis
          </Link>

          {/* Commercial Analysis */}
          <Link
            to="/package/$id/comm"
            params={{ id: packageId }}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm font-medium transition-colors ${
              isCommActive
                ? "bg-slate-100 text-slate-900"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
            }`}
          >
            <ReceiptText className="size-4" />
            Commercial Analysis
          </Link>

          {/* Assets under Commercial */}
          <div className="pl-6 space-y-1">
            {assets.map((asset: Asset) => {
              const isAssetActive = currentPath === `/package/${pkg.id}/comm/${asset.id}`
              return (
                <Link
                  key={asset.id}
                  to="/package/$id/comm/$assetId"
                  params={{ id: pkg.id, assetId: asset.id }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm transition-colors ${
                    isAssetActive
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
                  }`}
                >
                  <FileBox className="size-4" />
                  <span className="truncate">{asset.name}</span>
                </Link>
              )
            })}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors w-full"
            >
              <Plus className="size-4" />
              <span>New asset</span>
            </button>
          </div>
        </div>
      </div>

    </Sidemenu>

      <Drawer open={drawerOpen} direction="right" onClose={closeDrawer}>
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
                  A clear name helps everyone understand what this asset contains.
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
    </>
  )
}

