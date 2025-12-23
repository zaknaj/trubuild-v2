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
import {
  createAssetFn,
  getPackageWithAssetsFn,
  invitePackageMemberFn,
  getPackageMembersFn,
  getPackageInvitationsFn,
} from "@/fn"
import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { FormEvent, useEffect, useState } from "react"
import { z } from "zod"
import { UserPlus, Mail } from "lucide-react"

export const Route = createFileRoute("/_app/package/$id")({
  loader: async ({ params }) => {
    const [packageData, members, invitations] = await Promise.all([
      getPackageWithAssetsFn({ data: { packageId: params.id } }),
      getPackageMembersFn({ data: { packageId: params.id } }).catch(() => []),
      getPackageInvitationsFn({ data: { packageId: params.id } }).catch(
        () => []
      ),
    ])
    return { ...packageData, members, invitations }
  },
  validateSearch: z.object({
    newAsset: z.boolean().optional(),
    invite: z.boolean().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const {
    package: pkg,
    project,
    assets,
    members: initialMembers,
    invitations: initialInvitations,
  } = Route.useLoaderData()
  const { newAsset, invite } = Route.useSearch()
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()

  const [assetName, setAssetName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedAssetName = assetName.trim()

  // Invite state
  const [invitations, setInvitations] = useState(initialInvitations)
  const members = initialMembers
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<
    "package_lead" | "commercial_team" | "technical_team"
  >("package_lead")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false)

  useEffect(() => {
    if (!newAsset) {
      setAssetName("")
      setCreateError(null)
      setIsSubmitting(false)
    }
  }, [newAsset])

  useEffect(() => {
    if (!invite) {
      setInviteEmail("")
      setInviteRole("package_lead")
      setInviteError(null)
      setIsInviteSubmitting(false)
    }
  }, [invite])

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

  const closeInviteDrawer = () => {
    navigate({
      to: location.pathname,
      search: (prev) => ({ ...prev, invite: false }),
    })
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = inviteEmail.trim()
    if (!trimmedEmail) {
      setInviteError("Email is required")
      return
    }

    setIsInviteSubmitting(true)
    setInviteError(null)

    // Optimistically add to list
    const optimisticInvite = {
      id: `temp-${Date.now()}`,
      email: trimmedEmail,
      role: inviteRole,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }
    setInvitations((prev) => [optimisticInvite, ...prev])
    closeInviteDrawer()
    setInviteEmail("")
    setInviteRole("package_lead")

    try {
      await invitePackageMemberFn({
        data: { packageId: pkg.id, email: trimmedEmail, role: inviteRole },
      })
      await router.invalidate()
    } catch (error) {
      setInvitations((prev) => prev.filter((i) => i.id !== optimisticInvite.id))
      setInviteError(
        error instanceof Error ? error.message : "Failed to send invitation"
      )
      navigate({
        to: location.pathname,
        search: (prev) => ({ ...prev, invite: true }),
      })
      setInviteEmail(trimmedEmail)
    } finally {
      setIsInviteSubmitting(false)
    }
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
            onClick={() =>
              navigate({
                to: location.pathname,
                search: (prev) => ({ ...prev, invite: true }),
              })
            }
            className="gap-1.5"
          >
            <UserPlus className="size-4" />
            Invite
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {members.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No members yet
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                {m.userImage ? (
                  <img
                    src={m.userImage}
                    alt=""
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                    {m.userName?.charAt(0) || m.userEmail.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.userName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {m.userEmail}
                  </p>
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
            <p className="text-sm font-medium text-slate-900 mb-2">
              Pending Invitations
            </p>
            <div className="border rounded-lg divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3">
                  <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <Mail className="size-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Invitation pending
                    </p>
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

      <Drawer open={!!invite} direction="right" onClose={closeInviteDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleInvite}>
            <DrawerHeader>
              <DrawerTitle>Invite to Package</DrawerTitle>
              <DrawerDescription>
                Invite team members to collaborate on this package.
              </DrawerDescription>
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
                  disabled={isInviteSubmitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
                  disabled={isInviteSubmitting}
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

              {inviteError && (
                <p className="text-sm text-red-500">{inviteError}</p>
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
                disabled={isInviteSubmitting || !inviteEmail.trim()}
                className="flex-1"
              >
                {isInviteSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
