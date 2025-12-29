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
import { SettingsIcon, LogOutIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

export const AccountNavButton = () => {
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const user = session?.user
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate({ to: "/login" })
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
