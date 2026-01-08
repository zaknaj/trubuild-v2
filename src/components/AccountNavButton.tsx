import { useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/auth/auth-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { sessionQueryOptions } from "@/lib/query-options"
import { SettingsIcon, LogOutIcon, ShieldIcon, UserXIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { SettingsDialog } from "@/components/SettingsDialog"

export const AccountNavButton = () => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const user = session?.user
  const queryClient = useQueryClient()

  const isSuperuser = user?.email?.endsWith("@trubuild.io") ?? false
  const isImpersonating = !!session?.session?.impersonatedBy

  const handleLogout = async () => {
    await authClient.signOut()
    queryClient.clear()
    // Hard navigate to ensure auth cookies + loader state are definitely fresh.
    window.location.href = "/login"
  }

  const handleStopImpersonating = async () => {
    await authClient.admin.stopImpersonating()
    window.location.reload()
  }

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="navGhost" className="flex items-center gap-2">
            {user?.image ? (
              <img
                src={user.image}
                alt=""
                className="size-6 rounded-full object-cover"
              />
            ) : (
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium uppercase">
                {user?.name?.charAt(0) || user?.email?.charAt(0)}
              </div>
            )}
            {user?.name ? (
              <span className="font-medium capitalize">{user.name}</span>
            ) : (
              <span className="text-sm">{user?.email}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40 w-fit text-13">
          <DropdownMenuLabel className="flex flex-col gap-0.5 whitespace-nowrap">
            {user?.email}
            {isImpersonating && (
              <span className="text-xs text-amber-600 font-normal">
                Impersonating
              </span>
            )}
          </DropdownMenuLabel>
          {isSuperuser && (
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <ShieldIcon size="10" />
                Admin
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <SettingsIcon size="10" />
            Settings
          </DropdownMenuItem>
          {isImpersonating && (
            <DropdownMenuItem onSelect={handleStopImpersonating}>
              <UserXIcon size="10" />
              Stop Impersonating
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOutIcon size="10" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
