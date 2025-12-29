import { createFileRoute, Link } from "@tanstack/react-router"
import { PageSidebar } from "@/components/PageSidebar"
import { useState, useRef, useEffect } from "react"
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
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { UserPlus, Clock, X, Loader2 } from "lucide-react"
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
  projectMembersQueryOptions,
} from "@/lib/query-options"
import { addPackageMemberFn, removePackageMemberFn } from "@/fn"
import type { Member } from "@/lib/types"

export const Route = createFileRoute("/_app/package/$id/settings")({
  loader: async ({ params, context }) => {
    const packageData = await context.queryClient.ensureQueryData(
      packageDetailQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      packageMembersQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(
      packageAccessQueryOptions(params.id)
    )
    void context.queryClient.ensureQueryData(orgMembersQueryOptions)
    // Also load project members for display
    void context.queryClient.ensureQueryData(
      projectMembersQueryOptions(packageData.project.id)
    )
  },
  component: RouteComponent,
})

type PackageRole = "package_lead" | "commercial_team" | "technical_team"

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(id))
  const { data: accessInfo } = useSuspenseQuery(packageAccessQueryOptions(id))
  const { data: orgMembers } = useSuspenseQuery(orgMembersQueryOptions)
  const queryClient = useQueryClient()

  const { package: pkg, project } = packageData

  // Load project members for display
  const { data: projectMembers } = useSuspenseQuery(
    projectMembersQueryOptions(project.id)
  )

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<PackageRole>("commercial_team")
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canInvite = accessInfo.access === "full"

  // Filter org members who are not already package members
  const packageMemberEmails = new Set(members.map((m: Member) => m.email))
  const availableOrgMembers = orgMembers.filter(
    (m) => !packageMemberEmails.has(m.email)
  )

  // Filter suggestions based on email input
  const suggestions = availableOrgMembers.filter(
    (m) =>
      m.email.toLowerCase().includes(email.toLowerCase()) ||
      m.userName?.toLowerCase().includes(email.toLowerCase())
  )

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: PackageRole }) =>
      addPackageMemberFn({ data: { packageId: pkg.id, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageMembersQueryOptions(id).queryKey,
      })
      setEmail("")
      setShowSuggestions(false)
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

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    addMember.mutate({ email: trimmedEmail, role })
  }

  const handleSelectSuggestion = (memberEmail: string) => {
    setEmail(memberEmail)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleRemove = (memberEmail: string) => {
    setRemovingEmail(memberEmail)
    removeMember.mutate(memberEmail)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const activeMembers = members.filter((m: Member) => m.userId !== null)
  const pendingMembers = members.filter((m: Member) => m.userId === null)

  const activeProjectMembers = projectMembers.filter(
    (m: Member) => m.userId !== null
  )
  const pendingProjectMembers = projectMembers.filter(
    (m: Member) => m.userId === null
  )

  return (
    <>
      <PageSidebar>
        <div className="font-medium">package-settings</div>
      </PageSidebar>
      <div className="p-6 space-y-8 max-w-[600px] mx-auto">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Package Settings
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

        {/* Add Members - only for users with full access */}
        {canInvite && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Add Members</h2>
              <p className="text-sm text-muted-foreground">
                Invite people to collaborate on this package
              </p>
            </div>

            <form
              onSubmit={handleAddMember}
              className="border rounded-lg p-4 space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="flex gap-2">
                  <Popover open={showSuggestions && suggestions.length > 0}>
                    <PopoverAnchor asChild>
                      <Input
                        ref={inputRef}
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        disabled={addMember.isPending}
                        className="flex-1"
                        autoComplete="off"
                      />
                    </PopoverAnchor>
                    <PopoverContent
                      className="p-1 w-[--radix-popover-trigger-width]"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {suggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                            onClick={() => handleSelectSuggestion(m.email)}
                          >
                            {m.userImage ? (
                              <img
                                src={m.userImage}
                                alt=""
                                className="size-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground">
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
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as PackageRole)}
                    disabled={addMember.isPending}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
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
                  <Button
                    type="submit"
                    disabled={addMember.isPending || !email.trim()}
                    className="gap-1.5"
                  >
                    <UserPlus className="size-4" />
                    Invite
                  </Button>
                </div>
                {addMember.error && (
                  <p className="text-sm text-red-500">
                    {addMember.error instanceof Error
                      ? addMember.error.message
                      : "Failed to add member"}
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        {/* Package Members */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Package Members</h2>
            <p className="text-sm text-muted-foreground">
              People with direct access to this package
            </p>
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

        {/* Project Members (read-only) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Project Members</h2>
            <p className="text-sm text-muted-foreground">
              People with access via the parent project
            </p>
          </div>

          <div className="border rounded-lg divide-y opacity-75">
            {projectMembers.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No project members
              </div>
            ) : (
              <>
                {activeProjectMembers.map((m: Member) => (
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
                {pendingProjectMembers.map((m: Member) => (
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
      </div>
    </>
  )
}
