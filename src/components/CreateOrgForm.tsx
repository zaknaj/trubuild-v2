import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/auth/auth-client"
import { setOrgCreatorAsOwnerFn, setActiveOrgFn } from "@/fn"
import { orgsQueryOptions, sessionQueryOptions } from "@/lib/query-options"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

interface CreateOrgFormProps {
  onSuccess?: (orgId: string) => void
}

export function CreateOrgForm({ onSuccess }: CreateOrgFormProps) {
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
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey }),
        queryClient.invalidateQueries({
          queryKey: sessionQueryOptions.queryKey,
        }),
      ])
      if (result?.data?.id) {
        onSuccess?.(result.data.id)
      }
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

  const isCreating = createOrg.isPending

  return (
    <>
      <h2 className="text-base font-semibold text-center">
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
          disabled={isCreating}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={isCreating || !orgName.trim()}
          className="w-full mt-3"
        >
          {isCreating ? <Spinner /> : "Create organization"}
        </Button>
      </form>
    </>
  )
}
