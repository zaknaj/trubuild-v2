import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { authClient } from "@/auth/auth-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { sessionQueryOptions } from "@/lib/query-options"
import { SettingsIcon, LogOutIcon, ShieldIcon, UserXIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

export const AccountNavButton = () => {
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const user = session?.user
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isSuperuser = user?.email?.endsWith("@trubuild.io") ?? false
  const isImpersonating = !!session?.session?.impersonatedBy

  const handleLogout = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate({ to: "/login" })
  }

  const handleStopImpersonating = async () => {
    await authClient.admin.stopImpersonating()
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="navGhost">
          <div className="size-6 rounded-full bg-white/20" />
          {user?.name ? (
            <span className="font-medium capitalize">{user.name}</span>
          ) : (
            <span className="text-sm">{user?.email}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 w-fit">
        <DropdownMenuLabel className="flex flex-col gap-0.5 whitespace-nowrap">
          {user?.email}
          {isImpersonating && (
            <span className="text-xs text-amber-600 font-normal">
              Impersonating
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isSuperuser && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldIcon />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        {isImpersonating && (
          <DropdownMenuItem onSelect={handleStopImpersonating}>
            <UserXIcon />
            Stop Impersonating
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
