import { useState } from "react"
import {
  createFileRoute,
  redirect,
  useNavigate,
  Link,
} from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import {
  getAuthBootstrapFn,
  setOrgCreatorAsOwnerFn,
  setActiveOrgFn,
} from "@/fn"
import { authClient } from "@/auth/auth-client"
import { orgsQueryOptions, sessionQueryOptions } from "@/lib/query-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { LoginBackground } from "@/components/ProgressiveBackground"

const requireAuth = createMiddleware().server(async ({ next }) => {
  const { session, orgs } = await getAuthBootstrapFn()
  if (!session) throw redirect({ to: "/login" })
  return next({ context: { hasOrgs: orgs.length > 0 } })
})

export const Route = createFileRoute("/create-org")({
  component: CreateOrgPage,
  server: { middleware: [requireAuth] },
  loader: async () => {
    const { orgs } = await getAuthBootstrapFn()
    return { hasOrgs: orgs.length > 0 }
  },
})

function CreateOrgPage() {
  const { hasOrgs } = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [orgName, setOrgName] = useState("")

  const createOrg = useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.organization.create({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      })
      if (result.error) throw result.error
      if (result?.data?.id) {
        try {
          await setOrgCreatorAsOwnerFn({
            data: { organizationId: result.data.id },
          })
        } catch {
          // Continue anyway
        }
        await setActiveOrgFn({ data: { organizationId: result.data.id } })
      }
      return result
    },
    onSuccess: async () => {
      // Clear all cached data from previous org
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0]
          return key !== "session" && key !== "organizations"
        },
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey }),
        queryClient.invalidateQueries({
          queryKey: sessionQueryOptions.queryKey,
        }),
      ])
      navigate({ to: "/" })
    },
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === "ORGANIZATION_ALREADY_EXISTS") {
        toast.error("Organization name is already taken")
      } else {
        toast.error(error.message || "Failed to create organization")
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = orgName.trim()
    if (!name) return
    createOrg.mutate(name)
  }

  const isLoading = createOrg.isPending || createOrg.isSuccess

  return (
    <div className="flex h-screen">
      <div className="flex-3 flex flex-col items-center justify-center gap-20 pb-40 min-w-150 shrink-0 relative">
        {hasOrgs && (
          <Link
            to="/"
            className="absolute top-6 left-6 flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </Link>
        )}
        <div className="flex flex-col items-center justify-center gap-3">
          <img src="/logo-black.png" alt="Logo" className="w-16 h-16" />
          <h1 className="text-2xl font-medium">TruBuild</h1>
        </div>
        <div className="flex flex-col gap-6 w-70">
          <h2 className="font-medium text-center text-lg">
            Create an organization
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <Input
              placeholder="Organization name"
              autoFocus
              className="bg-white w-full text-center"
              value={orgName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOrgName(e.target.value)
              }
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !orgName.trim()}
              className="w-fit rounded-full px-3 mt-3 h-8.5"
            >
              {isLoading ? <Spinner /> : "Create organization"}
            </Button>
          </form>
        </div>
      </div>

      <LoginBackground className="flex-4" />
    </div>
  )
}
