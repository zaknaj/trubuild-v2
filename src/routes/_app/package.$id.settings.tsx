import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserPlus, Clock, X, Loader2, Archive } from "lucide-react"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  packageDetailQueryOptions,
  packageMembersQueryOptions,
  packageAccessQueryOptions,
  orgMembersQueryOptions,
  projectDetailQueryOptions,
  archivedPackagesQueryOptions,
} from "@/lib/query-options"
import { addPackageMemberFn, removePackageMemberFn, archivePackageFn, renamePackageFn } from "@/fn"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { toast } from "sonner"

export const Route = createFileRoute("/_app/package/$id/settings")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageMembersQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageAccessQueryOptions(params.id))
    context.queryClient.prefetchQuery(orgMembersQueryOptions)
  },
  component: RouteComponent,
})

type PackageRole = "package_lead" | "commercial_team" | "technical_team"

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(id))
  const { data: accessInfo } = useSuspenseQuery(packageAccessQueryOptions(id))
  const { data: orgMembers } = useSuspenseQuery(orgMembersQueryOptions)
  const queryClient = useQueryClient()

  const { package: pkg, project } = packageData

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<PackageRole>("commercial_team")
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [packageName, setPackageName] = useState("")

  const canInvite = accessInfo.access === "full"
  const canArchive = accessInfo.access === "full"
  const canRename = accessInfo.access === "full"

  useEffect(() => {
    setPackageName(pkg.name)
  }, [pkg.name])

  // Filter org members who are not already package members
  const packageMemberEmails = new Set(members.map((m) => m.email))
  const availableOrgMembers = orgMembers.filter(
    (m) => !packageMemberEmails.has(m.email)
  )

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: PackageRole }) =>
      addPackageMemberFn({ data: { packageId: pkg.id, ...data } }),
    onSuccess: () => {
      toast.success("Invitation sent")
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(id).queryKey,
      })
      closeDrawer()
    },
  })

  const removeMember = useMutation({
    mutationFn: (memberEmail: string) =>
      removePackageMemberFn({
        data: { packageId: pkg.id, email: memberEmail },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(id).queryKey,
      })
      setRemovingEmail(null)
    },
    onError: () => {
      setRemovingEmail(null)
    },
  })

  const archivePackage = useMutation({
    mutationFn: () => archivePackageFn({ data: { packageId: pkg.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDetailQueryOptions(project.id).queryKey })
      queryClient.invalidateQueries({ queryKey: archivedPackagesQueryOptions.queryKey })
      navigate({ to: "/project/$id", params: { id: project.id } })
    },
  })

  const renamePackage = useMutation({
    mutationFn: (name: string) => renamePackageFn({ data: { packageId: pkg.id, name } }),
    onMutate: () => {
      toast.loading("Renaming package...", { id: "rename-package" })
    },
    onSuccess: () => {
      toast.success("Package renamed", { id: "rename-package" })
      queryClient.invalidateQueries({ queryKey: packageDetailQueryOptions(id).queryKey })
      queryClient.invalidateQueries({ queryKey: projectDetailQueryOptions(project.id).queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rename package", { id: "rename-package" })
    },
  })

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = packageName.trim()
    if (!trimmedName || trimmedName === pkg.name) return
    renamePackage.mutate(trimmedName)
  }

  const closeDrawer = () => {
    setIsInviteOpen(false)
    setEmail("")
    setRole("commercial_team")
    addMember.reset()
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    addMember.mutate({ email: trimmedEmail, role })
  }

  const handleRemove = (memberEmail: string) => {
    setRemovingEmail(memberEmail)
    removeMember.mutate(memberEmail)
  }

  const activeMembers = members.filter((m) => m.userId !== null)
  const pendingMembers = members.filter((m) => m.userId === null)

  return (
    <>
      <div className="p-6 space-y-8 max-w-[600px] mx-auto">
        <Breadcrumbs
          crumbs={[
            { label: "All projects", to: "/all-projects" },
            { label: project.name, to: "/project/$id", params: { id: project.id } },
            { label: pkg.name, to: "/package/$id", params: { id } },
          ]}
        />
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Package Settings
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">{pkg.name}</h1>
        </div>

        {/* Rename Package */}
        {canRename && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Package Name</h2>
              <p className="text-sm text-muted-foreground">
                Change the display name of this package
              </p>
            </div>
            <form onSubmit={handleRename} className="flex gap-2">
              <Input
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                disabled={renamePackage.isPending}
                className="max-w-xs"
              />
              <Button
                type="submit"
                disabled={renamePackage.isPending || !packageName.trim() || packageName.trim() === pkg.name}
              >
                {renamePackage.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </section>
        )}

        {/* Package Members */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Package Members</h2>
              <p className="text-sm text-muted-foreground">
                People with direct access to this package
              </p>
            </div>
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
            {members.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No members yet
              </div>
            ) : (
              <>
                {activeMembers.map((m) => (
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
                    {canInvite && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(m.email)}
                        disabled={removingEmail === m.email}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {removingEmail === m.email ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
                {pendingMembers.map((m) => (
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
                    {canInvite && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(m.email)}
                        disabled={removingEmail === m.email}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {removingEmail === m.email ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
          {removeMember.error && (
            <p className="text-sm text-red-500">
              {removeMember.error instanceof Error
                ? removeMember.error.message
                : "Failed to remove member"}
            </p>
          )}
        </section>

        {/* Danger Zone */}
        {canArchive && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">
                Irreversible and destructive actions
              </p>
            </div>
            <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Archive this package</p>
                  <p className="text-sm text-muted-foreground">
                    The package will be hidden from view. You can restore it later.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Archive className="size-4" />
                  Archive
                </Button>
              </div>
              {archivePackage.error && (
                <p className="text-sm text-red-500 mt-2">
                  {archivePackage.error instanceof Error
                    ? archivePackage.error.message
                    : "Failed to archive package"}
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{pkg.name}". The package will be hidden from view but can be restored later from the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archivePackage.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => archivePackage.mutate()}
              disabled={archivePackage.isPending}
            >
              {archivePackage.isPending ? "Archiving..." : "Archive package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={isInviteOpen} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[400px]">
          <form onSubmit={handleAddMember} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle>Invite Member</DrawerTitle>
              <DrawerDescription>
                Invite someone to collaborate on this package.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={addMember.isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as PackageRole)}
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
              </div>

              {addMember.error && (
                <p className="text-sm text-red-500">
                  {addMember.error instanceof Error
                    ? addMember.error.message
                    : "Failed to add member"}
                </p>
              )}

              {availableOrgMembers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label>Suggestions</Label>
                  <p className="text-xs text-muted-foreground">
                    Organization members not yet in this package
                  </p>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {availableOrgMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
                        onClick={() => setEmail(m.email)}
                      >
                        {m.userImage ? (
                          <img
                            src={m.userImage}
                            alt=""
                            className="size-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground">
                            {m.userName?.charAt(0) || m.email.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-xs">
                            {m.userName || m.email}
                          </p>
                          {m.userName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {m.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
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
                disabled={addMember.isPending || !email.trim()}
                className="flex-1"
              >
                {addMember.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}
