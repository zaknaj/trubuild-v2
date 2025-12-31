import { createFileRoute } from "@tanstack/react-router"
import { inviteMemberFn, updateOrganizationFn, updateProfileFn } from "@/fn"
import { useState, useEffect, useRef } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { toast } from "sonner"

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const orgRoleLabels: Record<string, string> = {
  owner: "Admin",
  admin: "Project Owner",
  member: "Member",
}

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(orgMembersQueryOptions)
    context.queryClient.prefetchQuery(orgPendingInvitesQueryOptions)
    context.queryClient.prefetchQuery(orgsQueryOptions)
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
  const [role, setRole] = useState<"owner" | "admin" | "member">("member")
  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const orgLogoInputRef = useRef<HTMLInputElement>(null)

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

  const updateOrgName = useMutation({
    mutationFn: (name: string) => updateOrganizationFn({ data: { name } }),
    onMutate: () => {
      toast.loading("Renaming organization...", { id: "update-org-name" })
    },
    onSuccess: () => {
      toast.success("Organization renamed", { id: "update-org-name" })
      queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rename organization", { id: "update-org-name" })
    },
  })

  const updateOrgLogo = useMutation({
    mutationFn: (logo: string) => updateOrganizationFn({ data: { logo } }),
    onMutate: () => {
      toast.loading("Uploading logo...", { id: "update-org-logo" })
    },
    onSuccess: () => {
      toast.success("Logo updated", { id: "update-org-logo" })
      queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update logo", { id: "update-org-logo" })
    },
  })

  const updateProfileName = useMutation({
    mutationFn: (name: string) => updateProfileFn({ data: { name } }),
    onMutate: () => {
      toast.loading("Updating name...", { id: "update-profile-name" })
    },
    onSuccess: () => {
      toast.success("Name updated", { id: "update-profile-name" })
      queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update name", { id: "update-profile-name" })
    },
  })

  const updateProfileImage = useMutation({
    mutationFn: (image: string) => updateProfileFn({ data: { image } }),
    onMutate: () => {
      toast.loading("Uploading image...", { id: "update-profile-image" })
    },
    onSuccess: () => {
      toast.success("Profile image updated", { id: "update-profile-image" })
      queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update image", { id: "update-profile-image" })
    },
  })

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await toBase64(file)
    updateProfileImage.mutate(base64)
  }

  const handleOrgLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await toBase64(file)
    updateOrgLogo.mutate(base64)
  }

  const inviteMember = useMutation({
    mutationFn: (data: { email: string; role: typeof role }) =>
      inviteMemberFn({ data }),
    onSuccess: () => {
      toast.success("Invitation sent")
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
    <>
      <div className="pt-6 space-y-8 max-w-140 mx-auto">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {/* Profile Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Profile</h2>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => profileImageInputRef.current?.click()}
                    disabled={updateProfileImage.isPending}
                    className="relative size-12 rounded-full group cursor-pointer shrink-0"
                  >
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium uppercase text-muted-foreground">
                        {session?.user?.name?.charAt(0) ||
                          session?.user?.email?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="size-4 text-white" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Upload profile image</TooltipContent>
              </Tooltip>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={updateProfileName.isPending}
                placeholder="Your name"
                className="flex-1"
              />
              <Button
                onClick={() => updateProfileName.mutate(profileName)}
                disabled={
                  updateProfileName.isPending ||
                  profileName.trim() === session?.user?.name
                }
                size="sm"
              >
                Save
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {session?.user?.email}
            </div>
          </div>
        </section>
        {/* Organization Settings - only for admins/owners */}
        {canEditOrg && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Organization</h2>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <input
                  ref={orgLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleOrgLogoChange}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => orgLogoInputRef.current?.click()}
                      disabled={updateOrgLogo.isPending}
                      className="relative size-12 rounded-lg group cursor-pointer shrink-0"
                    >
                      {activeOrg?.logo ? (
                        <img
                          src={activeOrg.logo}
                          alt=""
                          className="size-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded-lg bg-muted flex items-center justify-center text-lg font-medium uppercase text-muted-foreground">
                          {activeOrg?.name?.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="size-4 text-white" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Upload organization logo</TooltipContent>
                </Tooltip>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={updateOrgName.isPending}
                  placeholder="Organization name"
                  className="flex-1"
                />
                <Button
                  onClick={() => updateOrgName.mutate(orgName)}
                  disabled={
                    updateOrgName.isPending || orgName.trim() === activeOrg?.name
                  }
                  size="sm"
                >
                  Save
                </Button>
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
    </>
  )
}
