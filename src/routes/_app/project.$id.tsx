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
  createPackageFn,
  getProjectWithPackagesFn,
  inviteProjectMemberFn,
  getProjectMembersFn,
  getProjectInvitationsFn,
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

export const Route = createFileRoute("/_app/project/$id")({
  loader: async ({ params }) => {
    const [projectData, members, invitations] = await Promise.all([
      getProjectWithPackagesFn({ data: { projectId: params.id } }),
      getProjectMembersFn({ data: { projectId: params.id } }).catch(() => []),
      getProjectInvitationsFn({ data: { projectId: params.id } }).catch(
        () => []
      ),
    ])
    return { ...projectData, members, invitations }
  },
  validateSearch: z.object({
    newPkg: z.boolean().optional(),
    invite: z.boolean().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const {
    project,
    packages,
    members: initialMembers,
    invitations: initialInvitations,
  } = Route.useLoaderData()
  const { newPkg, invite } = Route.useSearch()
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()

  const [packageName, setPackageName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedPackageName = packageName.trim()

  // Invite state
  const [invitations, setInvitations] = useState(initialInvitations)
  const members = initialMembers
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<
    "project_lead" | "commercial_lead" | "technical_lead"
  >("project_lead")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false)

  useEffect(() => {
    if (!newPkg) {
      setPackageName("")
      setCreateError(null)
      setIsSubmitting(false)
    }
  }, [newPkg])

  useEffect(() => {
    if (!invite) {
      setInviteEmail("")
      setInviteRole("project_lead")
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
      search: (prev) => ({ ...prev, newPkg: false }),
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
    setInviteRole("project_lead")

    try {
      await inviteProjectMemberFn({
        data: { projectId: project.id, email: trimmedEmail, role: inviteRole },
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

  const handleCreatePackage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedPackageName) {
      setCreateError("Package name is required")
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      await createPackageFn({
        data: { projectId: project.id, name: trimmedPackageName },
      })
      closeDrawer()
      await router.invalidate()
    } catch (error) {
      console.error(error)
      setCreateError(
        error instanceof Error ? error.message : "Unable to create package."
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
            Project
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(project.createdAt)}
          </p>
        </div>
        <Button
          onClick={() =>
            navigate({
              to: location.pathname,
              search: (prev) => ({ ...prev, newPkg: true }),
            })
          }
        >
          New package
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Members</p>
            <p className="text-xs text-muted-foreground">
              People with access to this project
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
        <p className="text-sm font-medium text-slate-900">Packages</p>
        <p className="text-sm text-muted-foreground">
          Organize your work into installable units.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          This project does not have any packages yet. Create one to get
          started.
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {pkg.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(pkg.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/package/$id",
                      params: { id: pkg.id },
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

      <Drawer open={!!newPkg} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreatePackage}>
            <DrawerHeader>
              <DrawerTitle>Create package</DrawerTitle>
              <DrawerDescription>
                Packages live inside your project and gather related assets.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="package-name">Package name</Label>
              <Input
                id="package-name"
                placeholder="Landing pages"
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              {createError ? (
                <p className="text-sm text-red-500">{createError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick something descriptive so your teammates know what this
                  package holds.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={isSubmitting || !trimmedPackageName}
              >
                {isSubmitting ? "Creating..." : "Create package"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!invite} direction="right" onClose={closeInviteDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleInvite}>
            <DrawerHeader>
              <DrawerTitle>Invite to Project</DrawerTitle>
              <DrawerDescription>
                Invite team members to collaborate on this project.
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
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="commercial_lead">
                      Commercial Lead
                    </SelectItem>
                    <SelectItem value="technical_lead">
                      Technical Lead
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Project leads have full access. Commercial and technical leads
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
