import { createFileRoute } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { commercialEvaluationsQueryOptions } from "@/lib/query-options"
import { updateCommercialEvaluationPTCsFn } from "@/fn"
import useStore from "@/lib/store"
import { PTCTable } from "@/components/PTCTable"
import { FileQuestion } from "lucide-react"
import type { CommercialEvaluationData, ContractorPTCs } from "@/lib/types"
import { toast } from "sonner"

type CommercialEvaluation = {
  id: string
  assetId: string
  roundNumber: number
  roundName: string
  data: CommercialEvaluationData | Record<string, never>
  createdAt: Date
  updatedAt: Date
}

export const Route = createFileRoute("/_app/package/$id/comm/$assetId/ptc")({
  component: RouteComponent,
})

function RouteComponent() {
  const { assetId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: evaluations } = useSuspenseQuery(
    commercialEvaluationsQueryOptions(assetId)
  )

  const evaluationsList = evaluations as CommercialEvaluation[]

  // Get round from Zustand store
  const selectedRoundId = useStore((s) => s.selectedCommRound[assetId])

  // Get current round
  const currentRound = selectedRoundId
    ? evaluationsList.find((e) => e.id === selectedRoundId)
    : evaluationsList[0]

  const updatePTCsMutation = useMutation({
    mutationFn: (updatedPTCs: ContractorPTCs[]) =>
      updateCommercialEvaluationPTCsFn({
        data: {
          evaluationId: currentRound!.id,
          ptcs: updatedPTCs,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commercialEvaluationsQueryOptions(assetId).queryKey,
      })
      toast.success("PTCs saved successfully")
    },
    onError: () => {
      toast.error("Failed to save PTCs")
    },
  })

  if (!currentRound) {
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

  const evalData = currentRound.data as CommercialEvaluationData | undefined
  const ptcs = evalData?.ptcs

  if (!ptcs || ptcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No PTCs Available</h3>
        <p className="text-muted-foreground max-w-sm">
          PTCs will be generated when the commercial evaluation analysis is run.
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
