import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"
import { Clock, X, Loader2, Archive } from "lucide-react"
import {
  useSuspenseQuery,
  useQuery,
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
import {
  addPackageMemberFn,
  removePackageMemberFn,
  archivePackageFn,
  renamePackageFn,
} from "@/fn"
import type { PackageMember } from "@/lib/types"
import { toast } from "sonner"

type PackageRole = "package_lead" | "commercial_team" | "technical_team"

interface PackageSettingsDialogProps {
  packageId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "general" | "members"
}

export function PackageSettingsDialog({
  packageId,
  open,
  onOpenChange,
  defaultTab = "general",
}: PackageSettingsDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: packageData } = useSuspenseQuery(
    packageDetailQueryOptions(packageId)
  )
  const { data: members } = useSuspenseQuery(
    packageMembersQueryOptions(packageId)
  )
  const { data: accessInfo } = useSuspenseQuery(
    packageAccessQueryOptions(packageId)
  )
  const { data: orgMembers = [] } = useQuery({
    ...orgMembersQueryOptions,
    enabled: open,
  })

  const { package: pkg, project } = packageData

  const [activeTab, setActiveTab] = useState<"general" | "members">(defaultTab)
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

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab])

  // Filter org members who are not already package members
  const packageMemberEmails = new Set(members.map((m: PackageMember) => m.email))
  const availableOrgMembers = orgMembers.filter(
    (m) => !packageMemberEmails.has(m.email)
  )

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: PackageRole }) =>
      addPackageMemberFn({ data: { packageId: pkg.id, ...data } }),
    onSuccess: () => {
      toast.success("Invitation sent")
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(packageId).queryKey,
      })
      setEmail("")
      setRole("commercial_team")
    },
  })

  const removeMember = useMutation({
    mutationFn: (memberEmail: string) =>
      removePackageMemberFn({
        data: { packageId: pkg.id, email: memberEmail },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(packageId).queryKey,
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
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: archivedPackagesQueryOptions.queryKey,
      })
      onOpenChange(false)
      navigate({ to: "/project/$id", params: { id: project.id } })
    },
  })

  const renamePackage = useMutation({
    mutationFn: (name: string) =>
      renamePackageFn({ data: { packageId: pkg.id, name } }),
    onMutate: () => {
      toast.loading("Renaming package...", { id: "rename-package" })
    },
    onSuccess: () => {
      toast.success("Package renamed", { id: "rename-package" })
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(packageId).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename package",
        { id: "rename-package" }
      )
    },
  })

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = packageName.trim()
    if (!trimmedName || trimmedName === pkg.name) return
    renamePackage.mutate(trimmedName)
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

  const activeMembers = members.filter((m: PackageMember) => m.userId !== null)
  const pendingMembers = members.filter((m: PackageMember) => m.userId === null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-200 h-[70vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Package Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage package settings and members
          </DialogDescription>
          <div className="flex h-full">
            {/* Sidenav */}
            <div className="w-48 border-r flex flex-col shrink-0">
              <h2 className="text-lg font-medium p-4">Package Settings</h2>
              <div className="flex-1 flex flex-col py-2">
                <button
                  onClick={() => setActiveTab("general")}
                  className={cn(
                    "px-4 py-2 text-left text-sm transition-colors",
                    activeTab === "general"
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/50"
                  )}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={cn(
                    "px-4 py-2 text-left text-sm transition-colors",
                    activeTab === "members"
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/50"
                  )}
                >
                  Members
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-w-0">
              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium">General</h2>

                  {/* Rename Package */}
                  {canRename && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-medium">Package Name</p>
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
                          size="sm"
                          disabled={
                            renamePackage.isPending ||
                            !packageName.trim() ||
                            packageName.trim() === pkg.name
                          }
                        >
                          {renamePackage.isPending ? "Saving..." : "Save"}
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Danger Zone */}
                  {canArchive && (
                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Archive this package</p>
                          <p className="text-sm text-muted-foreground">
                            The package will be hidden from view. You can
                            restore it later.
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
                  )}
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Members</h2>
                  {canInvite && (
                    <form
                      onSubmit={handleAddMember}
                      className="flex items-end gap-2 pb-4 border-b"
                    >
                      <div className="flex-1">
                        <label
                          htmlFor="invite-email"
                          className="text-xs text-muted-foreground mb-1 block"
                        >
                          Email
                        </label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={addMember.isPending}
                        />
                      </div>
                      <div className="w-40">
                        <label
                          htmlFor="invite-role"
                          className="text-xs text-muted-foreground mb-1 block"
                        >
                          Role
                        </label>
                        <Select
                          value={role}
                          onValueChange={(v) => setRole(v as PackageRole)}
                          disabled={addMember.isPending}
                        >
                          <SelectTrigger id="invite-role" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="package_lead">
                              Package Lead
                            </SelectItem>
                            <SelectItem value="commercial_team">
                              Commercial Team
                            </SelectItem>
                            <SelectItem value="technical_team">
                              Technical Team
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        disabled={addMember.isPending || !email.trim()}
                        size="sm"
                      >
                        {addMember.isPending ? "Inviting..." : "Invite"}
                      </Button>
                    </form>
                  )}

                  {addMember.error && (
                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                      {addMember.error instanceof Error
                        ? addMember.error.message
                        : "Failed to send invitation"}
                    </div>
                  )}

                  {availableOrgMembers.length > 0 && canInvite && (
                    <div className="space-y-2">
                      <Label>Suggestions</Label>
                      <p className="text-xs text-muted-foreground">
                        Organization members not yet in this package
                      </p>
                      <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
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

                  <div className="border rounded-lg divide-y">
                    {members.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No members yet
                      </div>
                    ) : (
                      <>
                        {activeMembers.map((m: PackageMember) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 p-3"
                          >
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
                        {pendingMembers.map((m: PackageMember) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 p-3 bg-amber-50/50"
                          >
                            <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center">
                              <Clock className="size-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{m.email}</p>
                              <p className="text-sm text-amber-600">
                                Pending signup
                              </p>
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
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{pkg.name}". The package will be hidden from
              view but can be restored later from the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archivePackage.isPending}>
              Cancel
            </AlertDialogCancel>
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
    </>
  )
}
