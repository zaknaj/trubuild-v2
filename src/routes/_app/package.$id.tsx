import { Button, buttonVariants } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAssetFn, addPackageMemberFn } from "@/fn"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import type { Member, Asset } from "@/lib/types"
import { UserPlus, Clock } from "lucide-react"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/package/$id")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      packageDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      packageMembersQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

type DrawerType = "createAsset" | "addMember" | null

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(id))
  const queryClient = useQueryClient()

  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [assetName, setAssetName] = useState("")
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState<
    "package_lead" | "commercial_team" | "technical_team"
  >("package_lead")

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

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: typeof memberRole }) =>
      addPackageMemberFn({ data: { packageId: pkg.id, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(id).queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setDrawer(null)
    setAssetName("")
    setMemberEmail("")
    setMemberRole("package_lead")
    createAsset.reset()
    addMember.reset()
  }

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault()
    const name = assetName.trim()
    if (!name) return
    createAsset.mutate(name)
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const email = memberEmail.trim()
    if (!email) return
    addMember.mutate({ email, role: memberRole })
  }

  const activeMembers = members.filter((m: Member) => m.userId !== null)
  const pendingMembers = members.filter((m: Member) => m.userId === null)

  return (
    <>
      <PageSidebar>
        <div className="font-medium">package</div>
      </PageSidebar>
      <div className="p-6 space-y-6 max-w-[600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Package
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">{pkg.name}</h1>
            <Link
              to="/project/$id"
              params={{ id: project.id }}
              className="text-xs font-medium text-blue-600 underline-offset-4 hover:underline"
            >
              Back to {project.name}
            </Link>
          </div>
          <Button onClick={() => setDrawer("createAsset")}>New asset</Button>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Members</p>
              <p className="text-xs text-muted-foreground">
                People with access to this package
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDrawer("addMember")}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Add
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            {members.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No members yet
              </div>
            ) : (
              <>
                {activeMembers.map((m: Member) => (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    {m.userImage ? (
                      <img
                        src={m.userImage}
                        alt=""
                        className="size-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                        {m.userName?.charAt(0) || m.email.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {m.userName || m.email}
                      </p>
                      {m.userName && (
                        <p className="text-sm text-muted-foreground truncate">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                      {m.role.replace("_", " ")}
                    </span>
                  </div>
                ))}
                {pendingMembers.map((m: Member) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 bg-amber-50/50"
                  >
                    <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="size-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.email}</p>
                      <p className="text-sm text-amber-600">Pending signup</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                      {m.role.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

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

        <Drawer
          open={drawer === "createAsset"}
          direction="right"
          onClose={closeDrawer}
        >
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

        <Drawer
          open={drawer === "addMember"}
          direction="right"
          onClose={closeDrawer}
        >
          <DrawerContent className="min-w-[500px]">
            <form className="space-y-6" onSubmit={handleAddMember}>
              <DrawerHeader>
                <DrawerTitle>Add Member</DrawerTitle>
                <DrawerDescription>
                  Add a team member by email. If they haven't signed up yet,
                  they'll get access when they do.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    disabled={addMember.isPending}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select
                    value={memberRole}
                    onValueChange={(v) => setMemberRole(v as typeof memberRole)}
                    disabled={addMember.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="package_lead">Package Lead</SelectItem>
                      <SelectItem value="commercial_team">
                        Commercial Team
                      </SelectItem>
                      <SelectItem value="technical_team">
                        Technical Team
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Package leads have full access. Commercial and technical teams
                    have access to their respective sections.
                  </p>
                </div>
                {addMember.error && (
                  <p className="text-sm text-red-500">
                    {addMember.error instanceof Error
                      ? addMember.error.message
                      : "Failed to add member"}
                  </p>
                )}
              </div>
              <DrawerFooter className="flex-row gap-2">
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </DrawerClose>
                <Button
                  type="submit"
                  disabled={addMember.isPending || !memberEmail.trim()}
                  className="flex-1"
                >
                  {addMember.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}
