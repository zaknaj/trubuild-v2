import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  SettingsIcon,
  BoxIcon,
  FolderOpenIcon,
  WrenchIcon,
  ReceiptTextIcon,
  FileBoxIcon,
  PlusIcon,
} from "lucide-react"
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
import { PackageSettingsDialog } from "@/components/PackageSettingsDialog"
import { createAssetFn } from "@/fn"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"
import type { Asset, PackageMember } from "@/lib/types"

const RAG_STATUSES = [
  { label: "On track", color: "bg-green-500" },
  { label: "At risk", color: "bg-amber-500" },
  { label: "Off track", color: "bg-red-500" },
] as const

export function PackageSidemenu({ packageId }: { packageId: string }) {
  const { data: packageData } = useSuspenseQuery(
    packageDetailQueryOptions(packageId)
  )
  const { data: members } = useSuspenseQuery(
    packageMembersQueryOptions(packageId)
  )
  const queryClient = useQueryClient()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [assetName, setAssetName] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<
    "general" | "members"
  >("general")
  const [ragStatus, setRagStatus] = useState<(typeof RAG_STATUSES)[number]>(
    RAG_STATUSES[0]
  )

  const { package: pkg, project, assets } = packageData

  const isTechActive = currentPath === `/package/${packageId}/tech`
  const isCommActive =
    currentPath === `/package/${packageId}/comm` ||
    currentPath.startsWith(`/package/${packageId}/comm/`)

  const leadMembers = members.filter(
    (m: PackageMember) => m.role === "package_lead"
  )
  const otherMembers = members.filter(
    (m: PackageMember) =>
      m.role === "commercial_team" || m.role === "technical_team"
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
          <div className="text-18 font-medium">{pkg.name}</div>
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
          <Link to="/project/$id" params={{ id: project.id }}>
            <Button variant="ghost" className="text-12 font-medium">
              <FolderOpenIcon />
              {project.name}
            </Button>
          </Link>
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Package</div>
          <Button variant="ghost" className="text-12 font-medium">
            <BoxIcon />
            {pkg.name}
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
          <div className="text-11 text-muted-foreground w-22">Package lead</div>
          <MemberDisplay members={leadMembers} onClick={openSettingsMembers} />
        </div>

        <div className="flex items-center h-9">
          <div className="text-11 text-muted-foreground w-22">Members</div>
          <MemberDisplay members={otherMembers} onClick={openSettingsMembers} />
        </div>

        <div className="text-11 text-muted-foreground mt-10 mb-3">Tools</div>
        <div className="flex flex-col items-baseline -ml-3 pr-8">
          <Link
            to="/package/$id/tech"
            params={{ id: packageId }}
            className={`text-12 font-medium flex gap-2 h-8 items-center w-full rounded px-3 ${
              isTechActive ? "bg-accent" : "hover:bg-accent"
            }`}
          >
            <WrenchIcon size="16" />
            Technical Analysis
          </Link>

          <Link
            to="/package/$id/comm"
            params={{ id: packageId }}
            className={`text-12 font-medium flex gap-2 h-8 items-center w-full rounded px-3 ${
              isCommActive ? "bg-accent" : "hover:bg-accent"
            }`}
          >
            <ReceiptTextIcon size="16" />
            Commercial Analysis
          </Link>

          {/* Assets under Commercial Analysis */}
          <div className="pl-6 w-full">
            {assets.map((asset: Asset) => {
              const isAssetActive =
                currentPath === `/package/${pkg.id}/comm/${asset.id}`
              return (
                <Link
                  key={asset.id}
                  to="/package/$id/comm/$assetId"
                  params={{ id: pkg.id, assetId: asset.id }}
                  className={`text-12 font-medium flex gap-2 h-8 items-center w-full rounded px-3 ${
                    isAssetActive ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <FileBoxIcon size="16" />
                  <span className="truncate">{asset.name}</span>
                </Link>
              )
            })}
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-12 text-green-700 font-medium flex gap-2 h-8 items-center hover:bg-accent w-full rounded px-3"
            >
              <PlusIcon size="16" />
              New asset
            </button>
          </div>
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

      <PackageSettingsDialog
        packageId={packageId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsDefaultTab}
      />
    </>
  )
}
