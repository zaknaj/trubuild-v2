import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { setActiveOrgFn } from "@/fn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useMutation,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { activeOrgIdQueryOptions, orgsQueryOptions } from "@/lib/query-options"
import { PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "./ui/button"

export const OrgNavButton = () => {
  const [open, setOpen] = useState(false)
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const { data: activeOrg } = useSuspenseQuery(activeOrgIdQueryOptions)
  const activeOrganization = orgs.find((org) => org.id === activeOrg)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const switchOrg = useMutation({
    mutationFn: async (organizationId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await setActiveOrgFn({ data: { organizationId } })
      return organizationId
    },
    onSuccess: () => {
      // Clear all cached data except session/orgs when switching org
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0]
          return (
            key !== "session" &&
            key !== "organizations" &&
            key !== "active-organization-id"
          )
        },
      })
      queryClient.invalidateQueries({
        queryKey: activeOrgIdQueryOptions.queryKey,
      })
      setOpen(false)
      navigate({ to: "/" })
    },
  })

  const isSwitching = switchOrg.isPending
  const switchingOrgId = switchOrg.variables

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="navGhost" className="-ml-2">
          <div className="size-6 rounded-md bg-white/20"></div>
          <span className="font-medium first-letter:uppercase">
            {activeOrganization?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 w-fit">
        <DropdownMenuLabel>My organizations</DropdownMenuLabel>
        {orgs.map((org) => {
          const isCurrentOrg = org.id === activeOrg
          const isSwitchingToThis = isSwitching && switchingOrgId === org.id
          const isDisabled = isCurrentOrg || isSwitching

          return (
            <DropdownMenuItem
              key={org.id}
              className={cn(
                "whitespace-nowrap h-9",
                isDisabled && "pointer-events-none"
              )}
              onSelect={(e) => {
                e.preventDefault()
                if (!isDisabled) {
                  switchOrg.mutate(org.id)
                }
              }}
            >
              {isSwitchingToThis ? (
                <Spinner className="size-6 stroke-1 opacity-50 " />
              ) : (
                <div
                  className={cn(
                    "size-6 rounded-full bg-black/10",
                    isCurrentOrg && "ring-primary  ring"
                  )}
                />
              )}
              {org.name}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(isSwitching && "pointer-events-none opacity-50")}
          onSelect={(e) => {
            if (isSwitching) {
              e.preventDefault()
              return
            }
            navigate({ to: "/create-org" })
          }}
        >
          <PlusIcon className="size-3 mx-1" />
          <div>Create an organization</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
