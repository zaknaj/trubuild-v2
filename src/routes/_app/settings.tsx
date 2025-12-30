import { createFileRoute } from "@tanstack/react-router"
import { inviteMemberFn, updateOrganizationFn, updateProfileFn } from "@/fn"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Upload } from "lucide-react"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  orgMembersQueryOptions,
  orgPendingInvitesQueryOptions,
  orgsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"
import type { OrgMember } from "@/lib/types"

const orgRoleLabels: Record<string, string> = {
  owner: "Admin",
  admin: "Project Owner",
  member: "Member",
}

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(orgMembersQueryOptions)
    void context.queryClient.ensureQueryData(orgPendingInvitesQueryOptions)
    void context.queryClient.ensureQueryData(orgsQueryOptions)
  },
})

function RouteComponent() {
  const { data: members } = useSuspenseQuery(orgMembersQueryOptions)
  const { data: pendingInvites } = useSuspenseQuery(
    orgPendingInvitesQueryOptions
  )
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const queryClient = useQueryClient()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"owner" | "admin" | "member">(
    "member"
  )

  const activeOrg = orgs?.find(
    (o) => o.id === session?.session?.activeOrganizationId
  )
  const [orgName, setOrgName] = useState(activeOrg?.name ?? "")
  const [profileName, setProfileName] = useState(session?.user?.name ?? "")

  useEffect(() => {
    setOrgName(activeOrg?.name ?? "")
  }, [activeOrg?.name])

  useEffect(() => {
    setProfileName(session?.user?.name ?? "")
  }, [session?.user?.name])

  const currentUserRole = members.find(
    (m: OrgMember) => m.userId === session?.user?.id
  )?.role
  const canInvite = currentUserRole === "owner"
  const canEditOrg = currentUserRole === "owner"

  const updateOrg = useMutation({
    mutationFn: (name: string) => updateOrganizationFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey })
    },
  })

  const updateProfile = useMutation({
    mutationFn: (name: string) => updateProfileFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
    },
  })

  const inviteMember = useMutation({
    mutationFn: (data: { email: string; role: typeof role }) =>
      inviteMemberFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orgMembersQueryOptions.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: orgPendingInvitesQueryOptions.queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setIsInviteOpen(false)
    setEmail("")
    setRole("member")
    inviteMember.reset()
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    inviteMember.mutate({ email: trimmedEmail, role })
  }

  return (
    <div className="p-6 space-y-8 max-w-[600px] mx-auto">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <div className="border rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-medium uppercase text-muted-foreground">
                  {session?.user?.name?.charAt(0) ||
                    session?.user?.email?.charAt(0)}
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <Upload className="size-4" />
                Upload
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileName">Name</Label>
            <div className="flex gap-2">
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={updateProfile.isPending}
              />
              <Button
                onClick={() => updateProfile.mutate(profileName)}
                disabled={
                  updateProfile.isPending ||
                  profileName.trim() === session?.user?.name
                }
                size="sm"
              >
                {updateProfile.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {updateProfile.error && (
              <p className="text-sm text-red-500">
                {updateProfile.error instanceof Error
                  ? updateProfile.error.message
                  : "Failed to update profile"}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>
        </div>
      </section>

      {/* Organization Settings - only for admins/owners */}
      {canEditOrg && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Organization</h2>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {activeOrg?.logo ? (
                  <img
                    src={activeOrg.logo}
                    alt=""
                    className="size-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="size-16 rounded-lg bg-muted flex items-center justify-center text-lg font-medium uppercase text-muted-foreground">
                    {activeOrg?.name?.charAt(0)}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled
                >
                  <Upload className="size-4" />
                  Upload
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={updateOrg.isPending}
                />
                <Button
                  onClick={() => updateOrg.mutate(orgName)}
                  disabled={
                    updateOrg.isPending || orgName.trim() === activeOrg?.name
                  }
                  size="sm"
                >
                  {updateOrg.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              {updateOrg.error && (
                <p className="text-sm text-red-500">
                  {updateOrg.error instanceof Error
                    ? updateOrg.error.message
                    : "Failed to update organization"}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Members */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Organization Members</h2>
          {canInvite && (
            <Button
              size="sm"
              onClick={() => setIsInviteOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Invite
            </Button>
          )}
        </div>

        <div className="border rounded-lg divide-y">
          {members.length === 0 && pendingInvites.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No members found
            </div>
          ) : (
            <>
              {members.map((m: OrgMember) => (
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
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {orgRoleLabels[m.role] ?? m.role}
                  </span>
                </div>
              ))}
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                    {inv.email.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-sm text-amber-600">Pending signup</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {orgRoleLabels[inv.role ?? "member"]}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <Drawer open={isInviteOpen} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[400px]">
          <form onSubmit={handleInvite} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle>Invite Member</DrawerTitle>
              <DrawerDescription>
                Invite someone to join your organization.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-6 space-y-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviteMember.isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as typeof role)}
                  disabled={inviteMember.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Admin</SelectItem>
                    <SelectItem value="admin">Project Owner</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins have full access. Project Owners can create projects.
                  Members have read access only.
                </p>
              </div>

              {inviteMember.error && (
                <p className="text-sm text-red-500">
                  {inviteMember.error instanceof Error
                    ? inviteMember.error.message
                    : "Failed to send invitation"}
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
                disabled={inviteMember.isPending || !email.trim()}
                className="flex-1"
              >
                {inviteMember.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
