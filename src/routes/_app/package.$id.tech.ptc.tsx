import { createFileRoute } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { technicalEvaluationDetailQueryOptions } from "@/lib/query-options"
import { updateTechnicalEvaluationPTCsFn } from "@/fn"
import useStore from "@/lib/store"
import { PTCTable } from "@/components/PTCTable"
import { FileQuestion } from "lucide-react"
import type { ContractorPTCs, TechnicalEvaluationData } from "@/lib/types"
import { toast } from "sonner"

export const Route = createFileRoute("/_app/package/$id/tech/ptc")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id: packageId } = Route.useParams()

  // Get round from Zustand store
  const evaluationId = useStore((s) => s.selectedTechRound[packageId])

  if (!evaluationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Evaluation Selected</h3>
        <p className="text-muted-foreground max-w-sm">
          Select or create an evaluation round to view PTC insights.
        </p>
      </div>
    )
  }

  return <PTCContent evaluationId={evaluationId} />
}

function PTCContent({ evaluationId }: { evaluationId: string }) {
  const queryClient = useQueryClient()

  const { data: evaluation } = useSuspenseQuery(
    technicalEvaluationDetailQueryOptions(evaluationId)
  )

  const evalData = (evaluation.data ?? {}) as Partial<TechnicalEvaluationData>
  const ptcs = evalData.ptcs as ContractorPTCs[] | undefined

  const updatePTCsMutation = useMutation({
    mutationFn: (updatedPTCs: ContractorPTCs[]) =>
      updateTechnicalEvaluationPTCsFn({
        data: {
          evaluationId,
          ptcs: updatedPTCs,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["technical-evaluation", evaluationId, "detail"],
      })
      toast.success("PTCs saved successfully")
    },
    onError: () => {
      toast.error("Failed to save PTCs")
    },
  })

  if (!ptcs || ptcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No PTCs Available</h3>
        <p className="text-muted-foreground max-w-sm">
          PTCs will be generated when the technical evaluation analysis is run.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-8 bg-background sticky top-0 z-10">
        <h2 className="text-base font-semibold">PTC Insights</h2>
      </div>

      <div className="p-6">
        <PTCTable
          contractors={ptcs}
          onSave={(updatedPTCs) => updatePTCsMutation.mutate(updatedPTCs)}
          isSaving={updatePTCsMutation.isPending}
        />
      </div>
    </div>
  )
}
