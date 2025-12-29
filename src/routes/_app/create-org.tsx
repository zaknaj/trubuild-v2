import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/auth/auth-client"
import { setOrgCreatorAsAdminFn } from "@/fn"
import { orgsQueryOptions, activeOrgIdQueryOptions } from "@/lib/query-options"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

export const Route = createFileRoute("/_app/create-org")({
  component: CreateOrgPage,
})

function CreateOrgPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: orgs } = useSuspenseQuery(orgsQueryOptions)
  const hasOrgs = orgs.length > 0
  const [orgName, setOrgName] = useState("")

  const createOrg = useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.organization.create({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      })
      if (result.error) {
        throw result.error
      }
      if (result?.data?.id) {
        try {
          await setOrgCreatorAsAdminFn({
            data: { organizationId: result.data.id },
          })
        } catch {
          // Continue anyway
        }
      }
      return result
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey }),
        queryClient.invalidateQueries({
          queryKey: activeOrgIdQueryOptions.queryKey,
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

  const handleLogout = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate({ to: "/login" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = orgName.trim()
    if (!name) return
    createOrg.mutate(name)
  }

  return (
    <div className="pb-25 flex-1 flex flex-col items-center justify-center gap-20">
      {!hasOrgs && (
        <div className="flex flex-col items-center justify-center gap-3">
          <img src="/logo-app.svg" alt="Logo" className="w-16 h-16" />
          <h1 className="text-lg font-semibold text-white">
            Welcome to TruBuild
          </h1>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="mx-auto space-y-3 bg-white p-12 pt-10 modal-with-border flex flex-col items-center justify-center"
      >
        <div className="text-base font-semibold mb-8">
          {hasOrgs
            ? "Create a new organization"
            : "Create your first organization"}
        </div>
        <Input
          placeholder="Organization name"
          autoFocus
          className="bg-white w-70 text-center py-4"
          value={orgName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setOrgName(e.target.value)
          }
          disabled={createOrg.isPending}
        />
        <Button
          type="submit"
          className="w-70 py-4"
          variant="primary"
          disabled={createOrg.isPending || !orgName.trim()}
        >
          {createOrg.isPending ? <Spinner /> : "Create organization"}
        </Button>
        {!hasOrgs && (
          <Button
            type="button"
            variant="ghost"
            className="mt-4"
            onClick={handleLogout}
          >
            Log out
          </Button>
        )}
      </form>
    </div>
  )
}
