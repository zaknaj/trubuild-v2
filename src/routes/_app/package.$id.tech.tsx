import { useState, useEffect } from "react"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  technicalEvaluationsQueryOptions,
  packageContractorsQueryOptions,
} from "@/lib/query-options"
import useStore from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, BarChart3 } from "lucide-react"
import { TechSetupWizard } from "@/components/TechSetupWizard"

type TechnicalEvaluation = {
  id: string
  packageId: string
  roundNumber: number
  roundName: string
  data: unknown
  createdAt: Date
  updatedAt: Date
}

export const Route = createFileRoute("/_app/package/$id/tech")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(
      technicalEvaluationsQueryOptions(params.id)
    )
    context.queryClient.prefetchQuery(packageContractorsQueryOptions(params.id))
  },
  component: RouteComponent,
})

const sidebarLinkClass = "nav-item nav-item-light"
const sidebarLinkActiveClass = "active"

function RouteComponent() {
  const { id } = Route.useParams()

  const { data: evaluations } = useSuspenseQuery(
    technicalEvaluationsQueryOptions(id)
  ) as {
    data: TechnicalEvaluation[]
  }
  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(id)
  )

  // Get/set round from Zustand store
  const selectedRoundId = useStore((s) => s.selectedTechRound[id])
  const setTechRound = useStore((s) => s.setTechRound)

  // State for setup wizard
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false)

  // Auto-select latest round when no round is stored or stored round is invalid
  useEffect(() => {
    if (evaluations.length > 0) {
      const storedRoundValid =
        selectedRoundId && evaluations.some((e) => e.id === selectedRoundId)
      if (!storedRoundValid) {
        setTechRound(id, evaluations[0].id)
      }
    }
  }, [evaluations, selectedRoundId, setTechRound, id])

  // Get current round - use stored, or default to latest
  const currentRound = selectedRoundId
    ? evaluations.find((e) => e.id === selectedRoundId)
    : evaluations[0]

  const hasEvaluations = evaluations.length > 0

  const handleRoundSelect = (roundId: string) => {
    setTechRound(id, roundId)
  }

  // Empty state - no evaluations yet
  if (!hasEvaluations) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <BarChart3 className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No technical evaluation yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start a technical evaluation to analyze and compare contractor
            proposals.
          </p>
          <Button onClick={() => setIsSetupWizardOpen(true)}>
            Start Technical Evaluation
          </Button>
        </div>

        <TechSetupWizard
          open={isSetupWizardOpen}
          onOpenChange={setIsSetupWizardOpen}
          packageId={id}
          contractors={contractors}
        />
      </>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <aside className="w-72 bg-white pb-4 px-[28px] overflow-auto space-y-6 border-r-[0.5px] border-black/15">
        {/* Title */}
        <h2 className="text-[16px] font-semibold text-gradient my-8 w-fit">
          Technical Evaluation
        </h2>

        {/* Round dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
            >
              {currentRound?.roundName ?? "Select Round"}
              <ChevronDown className="size-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {evaluations.map((evaluation) => (
              <DropdownMenuItem
                key={evaluation.id}
                onClick={() => handleRoundSelect(evaluation.id)}
              >
                {evaluation.roundName}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsSetupWizardOpen(true)}>
              <Plus className="size-4 mr-2" />
              New Round
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Nav links */}
        <div className="flex flex-col gap-px">
          <Link
            to="/package/$id/tech"
            params={{ id }}
            activeOptions={{ exact: true }}
            className={sidebarLinkClass}
            activeProps={{
              className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
            }}
          >
            Summary
          </Link>
          <Link
            to="/package/$id/tech/ptc"
            params={{ id }}
            className={sidebarLinkClass}
            activeProps={{
              className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
            }}
          >
            PTC Insights
          </Link>
          <Link
            to="/package/$id/tech/docs"
            params={{ id }}
            className={sidebarLinkClass}
            activeProps={{
              className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
            }}
          >
            Tender documents
          </Link>
        </div>
      </aside>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      <TechSetupWizard
        open={isSetupWizardOpen}
        onOpenChange={setIsSetupWizardOpen}
        packageId={id}
        contractors={contractors}
      />
    </div>
  )
}
