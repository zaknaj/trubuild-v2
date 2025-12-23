import { Button } from "@/components/ui/button"
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
import { createAssetFn, invitePackageMemberFn } from "@/fn"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FormEvent, useEffect, useState } from "react"

type Member = {
  id: string
  role: string
  createdAt: string
  userId: string
  userName: string | null
  userEmail: string
  userImage: string | null
}

type Invitation = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

type Asset = {
  id: string
  name: string
  createdAt: string | null
  updatedAt: string | null
}
import { UserPlus, Mail } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  packageDetailQueryOptions,
  packageInvitationsQueryOptions,
  packageMembersQueryOptions,
} from "@/lib/query-options"
import type { RouterContext } from "@/router"

export const Route = createFileRoute("/_app/package/$id")({
  loader: ({ params, context }) => {
    const { queryClient } = context as RouterContext
    void queryClient.ensureQueryData(packageDetailQueryOptions(params.id))
    void queryClient.ensureQueryData(packageMembersQueryOptions(params.id))
    void queryClient.ensureQueryData(packageInvitationsQueryOptions(params.id))
  },
  component: RouteComponent,
})

type DrawerType = "createAsset" | "invite" | null

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useQuery(packageDetailQueryOptions(id))
  const { data: members = [] } = useQuery(packageMembersQueryOptions(id))
  const { data: initialInvitations = [] } = useQuery(packageInvitationsQueryOptions(id))
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)

  // Asset form state
  const [assetName, setAssetName] = useState("")
  const [assetError, setAssetError] = useState<string | null>(null)
  const [isCreatingAsset, setIsCreatingAsset] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<
    "package_lead" | "commercial_team" | "technical_team"
  >("package_lead")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    setInvitations(initialInvitations)
  }, [initialInvitations])

  if (!packageData) return null
  const { package: pkg, project, assets } = packageData

  const closeDrawer = () => {
    setDrawer(null)
    setAssetName("")
    setAssetError(null)
    setInviteEmail("")
    setInviteRole("package_lead")
    setInviteError(null)
  }

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—"

  const handleCreateAsset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = assetName.trim()
    if (!name) {
      setAssetError("Asset name is required")
      return
    }

    setIsCreatingAsset(true)
    setAssetError(null)
    try {
      await createAssetFn({ data: { packageId: pkg.id, name } })
      closeDrawer()
      await queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(id).queryKey,
      })
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Unable to create asset.")
    } finally {
      setIsCreatingAsset(false)
    }
  }

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      setInviteError("Email is required")
      return
    }

    setIsInviting(true)
    setInviteError(null)

    const optimisticInvite = {
      id: `temp-${Date.now()}`,
      email,
      role: inviteRole,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }
    setInvitations((prev) => [optimisticInvite, ...prev])
    closeDrawer()

    try {
      await invitePackageMemberFn({
        data: { packageId: pkg.id, email, role: inviteRole },
      })
      await queryClient.invalidateQueries({
        queryKey: packageInvitationsQueryOptions(id).queryKey,
      })
    } catch (error) {
      setInvitations((prev) => prev.filter((i) => i.id !== optimisticInvite.id))
      setInviteError(error instanceof Error ? error.message : "Failed to send invitation")
      setDrawer("invite")
      setInviteEmail(email)
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Package</p>
          <h1 className="text-2xl font-semibold text-slate-900">{pkg.name}</h1>
          <p className="text-xs text-muted-foreground">Created {formatDate(pkg.createdAt)}</p>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 underline-offset-4 hover:underline"
            onClick={() => navigate({ to: "/project/$id", params: { id: project.id } })}
          >
            Back to {project.name}
          </button>
        </div>
        <Button onClick={() => setDrawer("createAsset")}>New asset</Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Members</p>
            <p className="text-xs text-muted-foreground">People with access to this package</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDrawer("invite")} className="gap-1.5">
            <UserPlus className="size-4" />
            Invite
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {members.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No members yet</div>
          ) : (
            members.map((m: Member) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                {m.userImage ? (
                  <img src={m.userImage} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                    {m.userName?.charAt(0) || m.userEmail.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.userName}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.userEmail}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                  {m.role.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>

        {invitations.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-900 mb-2">Pending Invitations</p>
            <div className="border rounded-lg divide-y">
              {invitations.map((inv: Invitation) => (
                <div key={inv.id} className="flex items-center gap-3 p-3">
                  <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <Mail className="size-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-sm text-muted-foreground">Invitation pending</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                    {inv.role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div key={asset.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(asset.createdAt)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({ to: "/package/$id/comm/$assetId", params: { id: pkg.id, assetId: asset.id } })
                  }
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawer === "createAsset"} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreateAsset}>
            <DrawerHeader>
              <DrawerTitle>Create asset</DrawerTitle>
              <DrawerDescription>Assets represent individual files, components, or work outputs.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="asset-name">Asset name</Label>
              <Input
                id="asset-name"
                placeholder="Hero section mock"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                disabled={isCreatingAsset}
                autoFocus
              />
              {assetError ? (
                <p className="text-sm text-red-500">{assetError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A clear name helps everyone understand what this asset contains.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={isCreatingAsset || !assetName.trim()}>
                {isCreatingAsset ? "Creating..." : "Create asset"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer open={drawer === "invite"} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleInvite}>
            <DrawerHeader>
              <DrawerTitle>Invite to Package</DrawerTitle>
              <DrawerDescription>Invite team members to collaborate on this package.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
                  disabled={isInviting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="package_lead">Package Lead</SelectItem>
                    <SelectItem value="commercial_team">Commercial Team</SelectItem>
                    <SelectItem value="technical_team">Technical Team</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Package leads have full access. Commercial and technical teams have access to their
                  respective sections.
                </p>
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
            </div>
            <DrawerFooter className="flex-row gap-2">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={isInviting || !inviteEmail.trim()} className="flex-1">
                {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
