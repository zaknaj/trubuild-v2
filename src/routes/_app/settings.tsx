import { createFileRoute } from "@tanstack/react-router"
import { inviteMemberFn } from "@/fn"
import { useState } from "react"
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
import { UserPlus } from "lucide-react"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { orgMembersQueryOptions, sessionQueryOptions } from "@/lib/query-options"
import type { Member } from "@/lib/types"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(orgMembersQueryOptions)
  },
})

function RouteComponent() {
  const { data: members } = useSuspenseQuery(orgMembersQueryOptions)
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const queryClient = useQueryClient()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "owner" | "member">("member")

  const currentUserRole = members.find((m: Member) => m.userId === session?.user?.id)?.role
  const canInvite = currentUserRole === "admin" || currentUserRole === "owner"

  const inviteMember = useMutation({
    mutationFn: (data: { email: string; role: typeof role }) =>
      inviteMemberFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgMembersQueryOptions.queryKey })
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
      <PageSidebar>
        <div className="font-medium">settings</div>
      </PageSidebar>
      <div className="p-6 space-y-6 max-w-[600px] mx-auto">
        <h1 className="text-2xl font-semibold">Settings</h1>

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
            {members.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No members found
              </div>
            ) : (
              members.map((m: Member) => (
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
                    {m.role}
                  </span>
                </div>
              ))
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
