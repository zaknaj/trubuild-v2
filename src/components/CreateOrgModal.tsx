import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CreateOrgForm } from "@/components/CreateOrgForm"
import { activeOrgIdQueryOptions } from "@/lib/query-options"

interface CreateOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSuccess = (orgId: string) => {
    queryClient.setQueryData(activeOrgIdQueryOptions.queryKey, orgId)
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
    onOpenChange(false)
    navigate({ to: "/" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-10 w-80">
        <CreateOrgForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
