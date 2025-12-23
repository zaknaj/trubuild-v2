import {
  Link,
  useNavigate,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { Route } from "@/routes/_app"
import { setActiveOrgFn } from "@/fn"
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
import { useState } from "react"

export const Navbar = () => {
  const { orgs, activeOrg, user } = Route.useLoaderData()
  const activeOrganization = orgs.find((org) => org.id === activeOrg)
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleOrgSwitch = async (organizationId: string) => {
    if (organizationId === activeOrg) return
    setIsSwitching(true)
    try {
      await setActiveOrgFn({ data: { organizationId } })
      await router.invalidate()
    } catch (error) {
      console.error("Failed to switch organization:", error)
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateOrg = () => {
    navigate({
      to: location.pathname,
      search: (prev) => ({ ...prev, createOrg: true }),
    })
  }

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: "/login" })
  }

  return (
    <div className="h-[67px] flex items-center px-7 text-white pb-2 justify-between">
      <div className="flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-white bg-transparent">
              logo | {activeOrganization ? activeOrganization.name : "..."}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrgSwitch(org.id)}
                disabled={isSwitching || org.id === activeOrg}
              >
                {org.name}
                {org.id === activeOrg && " ✓"}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateOrg}>
              Create new organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="w-fit flex items-center gap-[40px] justify-center">
        <Link
          to="/"
          className="opacity-50"
          activeProps={{ className: "underline opacity-100" }}
        >
          Overview
        </Link>
        <Link
          to="/all-projects"
          className="opacity-50"
          activeProps={{ className: "underline opacity-100" }}
        >
          All projects
        </Link>
        <Link
          to="/settings"
          className="opacity-50"
          activeProps={{ className: "underline opacity-100" }}
        >
          Settings
        </Link>
      </div>
      <div className="flex-1 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-white bg-transparent">
              <span className="font-medium">{user?.name}</span>
              <span className="opacity-50 text-sm">({user?.email})</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <div>{user?.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {user?.email}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
