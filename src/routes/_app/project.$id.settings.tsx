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
  projectDetailQueryOptions,
  projectMembersQueryOptions,
  projectAccessQueryOptions,
  orgMembersQueryOptions,
  projectsQueryOptions,
  archivedProjectsQueryOptions,
} from "@/lib/query-options"
import { addProjectMemberFn, removeProjectMemberFn, archiveProjectFn, renameProjectFn } from "@/fn"
import type { Member } from "@/lib/types"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { toast } from "sonner"

export const Route = createFileRoute("/_app/project/$id/settings")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(projectDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(projectMembersQueryOptions(params.id))
    context.queryClient.prefetchQuery(projectAccessQueryOptions(params.id))
    context.queryClient.prefetchQuery(orgMembersQueryOptions)
  },
  component: RouteComponent,
})

type ProjectRole = "project_lead" | "commercial_lead" | "technical_lead"

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(projectMembersQueryOptions(id))
  const { data: accessInfo } = useSuspenseQuery(projectAccessQueryOptions(id))
  const { data: orgMembers } = useSuspenseQuery(orgMembersQueryOptions)
  const queryClient = useQueryClient()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ProjectRole>("commercial_lead")
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState("")

  const { project } = projectData
  const canInvite = accessInfo.access === "full"
  const canArchive = accessInfo.access === "full"
  const canRename = accessInfo.access === "full"

  useEffect(() => {
    setProjectName(project.name)
  }, [project.name])

  // Filter org members who are not already project members
  const projectMemberEmails = new Set(members.map((m: Member) => m.email))
  const availableOrgMembers = orgMembers.filter(
    (m) => !projectMemberEmails.has(m.email)
  )

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: ProjectRole }) =>
      addProjectMemberFn({ data: { projectId: project.id, ...data } }),
    onSuccess: () => {
      toast.success("Invitation sent")
      queryClient.invalidateQueries({
        queryKey: projectMembersQueryOptions(id).queryKey,
      })
      closeDrawer()
    },
  })

  const removeMember = useMutation({
    mutationFn: (memberEmail: string) =>
      removeProjectMemberFn({
        data: { projectId: project.id, email: memberEmail },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMembersQueryOptions(id).queryKey,
      })
      setRemovingEmail(null)
    },
    onError: () => {
      setRemovingEmail(null)
    },
  })

  const archiveProject = useMutation({
    mutationFn: () => archiveProjectFn({ data: { projectId: project.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: archivedProjectsQueryOptions.queryKey })
      navigate({ to: "/all-projects" })
    },
  })

  const renameProject = useMutation({
    mutationFn: (name: string) => renameProjectFn({ data: { projectId: project.id, name } }),
    onMutate: () => {
      toast.loading("Renaming project...", { id: "rename-project" })
    },
    onSuccess: () => {
      toast.success("Project renamed", { id: "rename-project" })
      queryClient.invalidateQueries({ queryKey: projectDetailQueryOptions(id).queryKey })
      queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rename project", { id: "rename-project" })
    },
  })

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = projectName.trim()
    if (!trimmedName || trimmedName === project.name) return
    renameProject.mutate(trimmedName)
  }

  const closeDrawer = () => {
    setIsInviteOpen(false)
    setEmail("")
    setRole("commercial_lead")
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

  const activeMembers = members.filter((m: Member) => m.userId !== null)
  const pendingMembers = members.filter((m: Member) => m.userId === null)

  return (
    <>
      <div className="p-6 space-y-8 max-w-[600px] mx-auto">
        <Breadcrumbs
          crumbs={[
            { label: "All projects", to: "/all-projects" },
            { label: project.name, to: "/project/$id", params: { id } },
          ]}
        />
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Project Settings
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.name}
          </h1>
        </div>

        {/* Rename Project */}
        {canRename && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Project Name</h2>
              <p className="text-sm text-muted-foreground">
                Change the display name of this project
              </p>
            </div>
            <form onSubmit={handleRename} className="flex gap-2">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={renameProject.isPending}
                className="max-w-xs"
              />
              <Button
                type="submit"
                disabled={renameProject.isPending || !projectName.trim() || projectName.trim() === project.name}
              >
                {renameProject.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </section>
        )}

        {/* Project Members */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Project Members</h2>
              <p className="text-sm text-muted-foreground">
                People with access to this project
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
                  <p className="font-medium">Archive this project</p>
                  <p className="text-sm text-muted-foreground">
                    The project and all its packages will be hidden from view. You can restore it later.
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
              {archiveProject.error && (
                <p className="text-sm text-red-500 mt-2">
                  {archiveProject.error instanceof Error
                    ? archiveProject.error.message
                    : "Failed to archive project"}
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{project.name}" and all its packages. The project will be hidden from view but can be restored later from the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveProject.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => archiveProject.mutate()}
              disabled={archiveProject.isPending}
            >
              {archiveProject.isPending ? "Archiving..." : "Archive project"}
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
                Invite someone to collaborate on this project.
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
                  onValueChange={(v) => setRole(v as ProjectRole)}
                  disabled={addMember.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="commercial_lead">
                      Commercial Lead
                    </SelectItem>
                    <SelectItem value="technical_lead">
                      Technical Lead
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
                    Organization members not yet in this project
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
