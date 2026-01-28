import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { PlusIcon, UserIcon } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPackageContractorFn } from "@/fn"
import { packageContractorsQueryOptions } from "@/lib/query-options"
import { toast } from "sonner"

const searchSchema = z.object({
  addContractor: z.boolean().optional(),
})

export const Route = createFileRoute("/_app/package/$id/contractors")({
  validateSearch: searchSchema,
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageContractorsQueryOptions(params.id))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { addContractor } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(id)
  )

  const [sheetOpen, setSheetOpen] = useState(false)
  const [contractorName, setContractorName] = useState("")

  // Open sheet if addContractor search param is true
  useEffect(() => {
    if (addContractor) {
      setSheetOpen(true)
      // Clear the search param
      navigate({
        to: "/package/$id/contractors",
        params: { id },
        search: {},
        replace: true,
      })
    }
  }, [addContractor, id, navigate])

  const createContractor = useMutation({
    mutationFn: (name: string) =>
      createPackageContractorFn({ data: { packageId: id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packageContractorsQueryOptions(id).queryKey,
      })
      closeSheet()
      toast.success("Contractor added")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add contractor"
      )
    },
  })

  const closeSheet = () => {
    setSheetOpen(false)
    setContractorName("")
    createContractor.reset()
  }

  const handleCreateContractor = (e: React.FormEvent) => {
    e.preventDefault()
    const name = contractorName.trim()
    if (!name) return
    createContractor.mutate(name)
  }

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="max-w-[600px] mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">
              Contractors
            </h2>
            <Button
              onClick={() => setSheetOpen(true)}
              size="sm"
              variant="outline"
            >
              <PlusIcon size={14} />
              Add contractor
            </Button>
          </div>
          {contractors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted-foreground">
              No contractors yet. Add one to get started.
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {contractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100">
                    <UserIcon size={16} className="text-slate-500" />
                  </div>
                  <span className="font-medium text-sm">{contractor.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[350px] sm:max-w-none">
          <form onSubmit={handleCreateContractor}>
            <SheetHeader>
              <SheetTitle>Add contractor</SheetTitle>
              <SheetDescription>
                Add a contractor to this package.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractor-name">Contractor name</Label>
                <Input
                  id="contractor-name"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  disabled={createContractor.isPending}
                  autoFocus
                />
                {createContractor.error ? (
                  <p className="text-sm text-red-500">
                    {createContractor.error instanceof Error
                      ? createContractor.error.message
                      : "Unable to add contractor."}
                  </p>
                ) : null}
              </div>
            </div>
            <SheetFooter>
              <Button
                type="submit"
                disabled={createContractor.isPending || !contractorName.trim()}
              >
                {createContractor.isPending ? "Adding..." : "Add contractor"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
