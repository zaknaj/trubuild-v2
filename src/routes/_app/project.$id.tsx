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
import { createPackageFn, addProjectMemberFn } from "@/fn"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import type { Member, Package } from "@/lib/types"
import { UserPlus, Clock } from "lucide-react"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  projectDetailQueryOptions,
  projectMembersQueryOptions,
} from "@/lib/query-options"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/project/$id")({
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(
      projectDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      projectMembersQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

type DrawerType = "createPackage" | "addMember" | null

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(projectMembersQueryOptions(id))
  const queryClient = useQueryClient()

  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [packageName, setPackageName] = useState("")
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState<
    "project_lead" | "commercial_lead" | "technical_lead"
  >("project_lead")

  const { project, packages } = projectData

  const createPackage = useMutation({
    mutationFn: (name: string) =>
      createPackageFn({ data: { projectId: project.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      closeDrawer()
    },
  })

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: typeof memberRole }) =>
      addProjectMemberFn({ data: { projectId: project.id, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMembersQueryOptions(id).queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setDrawer(null)
    setPackageName("")
    setMemberEmail("")
    setMemberRole("project_lead")
    createPackage.reset()
    addMember.reset()
  }

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault()
    const name = packageName.trim()
    if (!name) return
    createPackage.mutate(name)
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
        <div className="font-medium">project</div>
      </PageSidebar>
      <div className="p-6 space-y-6 max-w-[600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Project
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {project.name}
            </h1>
          </div>
          <Button onClick={() => setDrawer("createPackage")}>New package</Button>
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
            {packages.map((pkg: Package) => (
              <div
                key={pkg.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {pkg.name}
                    </p>
                  </div>
                  <Link
                    to="/package/$id"
                    params={{ id: pkg.id }}
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
          open={drawer === "createPackage"}
          direction="right"
          onClose={closeDrawer}
        >
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
                  onChange={(e) => setPackageName(e.target.value)}
                  disabled={createPackage.isPending}
                  autoFocus
                />
                {createPackage.error ? (
                  <p className="text-sm text-red-500">
                    {createPackage.error instanceof Error
                      ? createPackage.error.message
                      : "Unable to create package."}
                  </p>
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
                  disabled={createPackage.isPending || !packageName.trim()}
                >
                  {createPackage.isPending ? "Creating..." : "Create package"}
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
