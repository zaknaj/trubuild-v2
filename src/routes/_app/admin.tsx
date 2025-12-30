import { createFileRoute, redirect } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/auth/auth-client"
import { useSuspenseQuery } from "@tanstack/react-query"
import { sessionQueryOptions } from "@/lib/query-options"
import { Button } from "@/components/ui/button"
import { UserIcon } from "lucide-react"

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions)
    const isSuperuser = session?.user?.email?.endsWith("@trubuild.io") ?? false
    if (!isSuperuser) {
      throw redirect({ to: "/" })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const { data: session } = useSuspenseQuery(sessionQueryOptions)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: Infinity,
        },
      })
      return result.data
    },
  })

  const handleImpersonate = async (userId: string) => {
    await authClient.admin.impersonateUser({ userId })
    window.location.href = "/"
  }

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section>
        <h2 className="text-lg font-medium mb-4">All Users</h2>

        {isLoading ? (
          <div className="text-muted-foreground">Loading users...</div>
        ) : (
          <div className="border rounded-lg divide-y">
            {usersData?.users?.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No users found
              </div>
            ) : (
              usersData?.users?.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                      {user.name?.charAt(0) || user.email.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.name || user.email}
                    </p>
                    {user.name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                  {user.id !== session?.user?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(user.id)}
                    >
                      <UserIcon className="size-4 mr-1" />
                      Impersonate
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  )
}
