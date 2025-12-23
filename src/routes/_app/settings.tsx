import { createFileRoute } from "@tanstack/react-router"
import { getOrgMembersFn, inviteMemberFn, getInvitationsFn } from "@/fn"
import { useState, FormEvent } from "react"
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
import { UserPlus, Mail } from "lucide-react"

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: async () => {
    const [members, invitations] = await Promise.all([
      getOrgMembersFn(),
      getInvitationsFn(),
    ])
    return { members, invitations }
  },
})

type Invitation = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: string
  createdAt: string | null
}

function RouteComponent() {
  const { members, invitations: initialInvitations } = Route.useLoaderData()
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "owner" | "member">("member")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Optimistically add to list and close drawer
    const optimisticInvite: Invitation = {
      id: `temp-${Date.now()}`,
      email: trimmedEmail,
      role,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }
    setInvitations((prev) => [optimisticInvite, ...prev])
    setIsInviteOpen(false)
    setEmail("")
    setRole("member")

    try {
      await inviteMemberFn({ data: { email: trimmedEmail, role } })
    } catch (err) {
      // Remove optimistic invite on error
      setInvitations((prev) => prev.filter((i) => i.id !== optimisticInvite.id))
      setError(err instanceof Error ? err.message : "Failed to send invitation")
      setIsInviteOpen(true)
      setEmail(trimmedEmail)
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeDrawer = () => {
    setIsInviteOpen(false)
    setEmail("")
    setRole("member")
    setError(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Members</h2>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="size-4" />
            Invite
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {members.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No members found
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
                  {m.role}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {invitations.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-4">Pending Invitations</h2>
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
                  {inv.role || "member"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Drawer open={isInviteOpen} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[400px]">
          <form onSubmit={handleInvite} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle>Invite Member</DrawerTitle>
              <DrawerDescription>
                Send an invitation to join your organization.
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
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as typeof role)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Members can view, admins can manage projects, owners have full
                  control.
                </p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <DrawerFooter className="flex-row gap-2">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="flex-1"
              >
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
