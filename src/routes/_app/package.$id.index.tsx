import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  ClipboardList,
  FileText,
  ArrowRight,
  Award,
  Trophy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  technicalEvaluationsQueryOptions,
  hasCommercialEvaluationQueryOptions,
  packageDetailQueryOptions,
  packageContractorsQueryOptions,
  packageCommercialSummaryQueryOptions,
  technicalEvaluationDetailQueryOptions,
  packageMembersQueryOptions,
  packageAccessQueryOptions,
  sessionQueryOptions,
  projectDetailQueryOptions,
} from "@/lib/query-options"
import {
  awardPackageFn,
  // updatePackageStageFn,
  // updatePackageRagStatusFn,
} from "@/fn"
import type { TechnicalEvaluationData } from "@/components/TechSetupWizard"
import type { CommercialEvaluationData } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
// import { PROCUREMENT_STAGES, RAG_STATUSES } from "@/lib/constants"
import { PackageSettingsDialog } from "@/components/PackageSettingsDialog"
import { SidebarMembersSection } from "@/components/SidebarMembersSection"

export const Route = createFileRoute("/_app/package/$id/")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(
      technicalEvaluationsQueryOptions(params.id)
    )
    context.queryClient.prefetchQuery(
      hasCommercialEvaluationQueryOptions(params.id)
    )
    context.queryClient.prefetchQuery(packageDetailQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageContractorsQueryOptions(params.id))
    context.queryClient.prefetchQuery(
      packageCommercialSummaryQueryOptions(params.id)
    )
    context.queryClient.prefetchQuery(packageMembersQueryOptions(params.id))
    context.queryClient.prefetchQuery(packageAccessQueryOptions(params.id))
  },
  component: RouteComponent,
})

// Helper: Calculate weighted technical score for a contractor
function calculateWeightedScore(
  contractorId: string,
  evalData: TechnicalEvaluationData
): number {
  const allBreakdowns =
    evalData.criteria?.scopes?.flatMap((s) => s.breakdowns) ?? []
  const contractorScores = evalData.scores?.[contractorId] ?? {}

  let totalScore = 0
  for (const breakdown of allBreakdowns) {
    const score = contractorScores[breakdown.id]?.score ?? 0
    totalScore += (score * breakdown.weight) / 100
  }
  return totalScore
}

// Helper: Get ranked technical contractors
function getTechnicalRankings(
  evalData: TechnicalEvaluationData | null,
  contractors: Array<{ id: string; name: string }>
) {
  if (!evalData || !evalData.scores) return []

  const proposalsUploaded = evalData.proposalsUploaded ?? []
  const evaluated = contractors.filter((c) => proposalsUploaded.includes(c.id))

  return evaluated
    .map((c) => ({
      id: c.id,
      name: c.name,
      score: calculateWeightedScore(c.id, evalData),
    }))
    .sort((a, b) => b.score - a.score) // Higher score = better
}

// Helper: Get ranked commercial contractors (aggregated across all assets)
function getCommercialRankings(
  commercialSummary: {
    assets: Array<{ evaluation: CommercialEvaluationData | null }>
  } | null
) {
  if (!commercialSummary || commercialSummary.assets.length === 0) return []

  // Aggregate totals across all assets
  const contractorTotals: Record<string, { name: string; total: number }> = {}

  for (const asset of commercialSummary.assets) {
    const evalData = asset.evaluation as CommercialEvaluationData | null
    if (!evalData?.contractors) continue

    for (const contractor of evalData.contractors) {
      if (!contractorTotals[contractor.contractorId]) {
        contractorTotals[contractor.contractorId] = {
          name: contractor.contractorName,
          total: 0,
        }
      }
      contractorTotals[contractor.contractorId].total += contractor.totalAmount
    }
  }

  return Object.entries(contractorTotals)
    .map(([id, data]) => ({
      id,
      name: data.name,
      total: data.total,
    }))
    .sort((a, b) => a.total - b.total) // Lower total = better
}

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [awardSheetOpen, setAwardSheetOpen] = useState(false)
  const [selectedContractorId, setSelectedContractorId] = useState<string>("")
  const [awardComments, setAwardComments] = useState<string>("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<
    "general" | "members" | "activity"
  >("general")

  const { data: technicalEvals } = useSuspenseQuery(
    technicalEvaluationsQueryOptions(id)
  )
  const { data: commercialEvalData } = useSuspenseQuery(
    hasCommercialEvaluationQueryOptions(id)
  )
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(id)
  )
  const { data: commercialSummary } = useSuspenseQuery(
    packageCommercialSummaryQueryOptions(id)
  )
  const { data: members } = useSuspenseQuery(packageMembersQueryOptions(id))
  const { data: accessData } = useSuspenseQuery(packageAccessQueryOptions(id))
  const { data: session } = useSuspenseQuery(sessionQueryOptions)

  const canEdit = accessData.access === "full"
  const canViewTechnical =
    accessData.access === "full" || accessData.access === "technical"
  const canViewCommercial =
    accessData.access === "full" || accessData.access === "commercial"

  // const updateStage = useMutation({
  //   mutationFn: (stage: string | null) =>
  //     updatePackageStageFn({ data: { packageId: id, stage } }),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({
  //       queryKey: packageDetailQueryOptions(id).queryKey,
  //     })
  //   },
  //   onError: (error) => {
  //     toast.error(
  //       error instanceof Error ? error.message : "Failed to update stage"
  //     )
  //   },
  // })

  // const updateRagStatus = useMutation({
  //   mutationFn: (ragStatus: string | null) =>
  //     updatePackageRagStatusFn({ data: { packageId: id, ragStatus } }),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({
  //       queryKey: packageDetailQueryOptions(id).queryKey,
  //     })
  //   },
  //   onError: (error) => {
  //     toast.error(
  //       error instanceof Error ? error.message : "Failed to update status"
  //     )
  //   },
  // })

  const openSettings = (tab: "general" | "members" | "activity") => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  // Get the latest technical evaluation details (if any)
  const latestTechEval = technicalEvals.length > 0 ? technicalEvals[0] : null
  const { data: techEvalDetail } = useQuery({
    ...technicalEvaluationDetailQueryOptions(latestTechEval?.id ?? ""),
    enabled: !!latestTechEval,
  })

  const awardPackage = useMutation({
    mutationFn: (data: { contractorId: string; comments?: string }) =>
      awardPackageFn({
        data: {
          packageId: id,
          contractorId: data.contractorId,
          comments: data.comments,
        },
      }),
    onSuccess: () => {
      // Invalidate package detail
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(id).queryKey,
      })
      // Also invalidate project detail (shows awarded contractor info)
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(packageData.project.id).queryKey,
      })
      setAwardSheetOpen(false)
      setSelectedContractorId("")
      setAwardComments("")
      toast.success("Package awarded successfully")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to award package"
      )
    },
  })

  const hasTechEval = technicalEvals.length > 0
  const hasCommercialEval = commercialEvalData.hasEvaluation

  // Calculate rankings
  const techEvalData = techEvalDetail?.data as TechnicalEvaluationData | null
  const technicalRankings = useMemo(
    () => getTechnicalRankings(techEvalData, contractors),
    [techEvalData, contractors]
  )
  const commercialRankings = useMemo(
    () => getCommercialRankings(commercialSummary),
    [commercialSummary]
  )

  // Get awarded contractor info
  const awardedContractor = packageData.package.awardedContractorId
    ? contractors.find((c) => c.id === packageData.package.awardedContractorId)
    : null

  // Check if latest tech eval review is complete
  const isTechReviewComplete = techEvalData?.status === "review_complete"

  // Get contractors that appear in BOTH technical and commercial evaluations
  const eligibleContractors = useMemo(() => {
    const techContractorIds = new Set(technicalRankings.map((r) => r.id))
    const commContractorIds = new Set(commercialRankings.map((r) => r.id))

    return contractors.filter(
      (c) => techContractorIds.has(c.id) && commContractorIds.has(c.id)
    )
  }, [contractors, technicalRankings, commercialRankings])

  // Determine if award button should be disabled and why
  const canAward = eligibleContractors.length > 0 && isTechReviewComplete
  const awardDisabledReason = !isTechReviewComplete
    ? "Complete the score review on the latest technical evaluation first"
    : eligibleContractors.length === 0
      ? "No contractors have completed both technical and commercial evaluations"
      : null

  // For award sheet: get selected contractor's info
  const selectedContractor = contractors.find(
    (c) => c.id === selectedContractorId
  )
  const selectedTechRank =
    technicalRankings.findIndex((r) => r.id === selectedContractorId) + 1
  const selectedTechScore = technicalRankings.find(
    (r) => r.id === selectedContractorId
  )?.score
  const selectedCommRank =
    commercialRankings.findIndex((r) => r.id === selectedContractorId) + 1
  const selectedCommTotal = commercialRankings.find(
    (r) => r.id === selectedContractorId
  )?.total

  return (
    <>
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Side menu */}
        <div className="w-72 bg-white pb-4 px-[28px] overflow-auto space-y-6 border-r-[0.5px] border-black/15">
          {/* Title */}
          <h2 className="text-[16px] font-semibold text-gradient my-8 w-fit">
            Package summary
          </h2>
          {/* RAG Status */}
          {/* <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </label>
            {canEdit ? (
              <Select
                value={packageData.package.ragStatus ?? "none"}
                onValueChange={(v) =>
                  updateRagStatus.mutate(v === "none" ? null : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground">
                    No status
                  </SelectItem>
                  {RAG_STATUSES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${r.color}`} />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : packageData.package.ragStatus ? (
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`size-2 rounded-full ${RAG_STATUSES.find((r) => r.value === packageData.package.ragStatus)?.color}`}
                />
                <span>
                  {
                    RAG_STATUSES.find(
                      (r) => r.value === packageData.package.ragStatus
                    )?.label
                  }
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No status</p>
            )}
          </div> */}

          {/* Stage */}
          {/* <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Stage
            </label>
            {canEdit ? (
              <Select
                value={packageData.package.stage ?? "none"}
                onValueChange={(v) =>
                  updateStage.mutate(v === "none" ? null : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground">
                    No stage
                  </SelectItem>
                  {PROCUREMENT_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : packageData.package.stage ? (
              <p className="text-sm">
                {PROCUREMENT_STAGES.find(
                  (s) => s.value === packageData.package.stage
                )?.label ?? packageData.package.stage}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No stage</p>
            )}
          </div> */}

          {/* Parent Project */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Parent Project</p>
            <Link
              to="/project/$id"
              params={{ id: packageData.project.id }}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <span>{packageData.project.name}</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>

          {/* Members */}
          <SidebarMembersSection
            members={members}
            type="package"
            canEdit={canEdit}
            onManageClick={() => openSettings("members")}
            currentUserId={session?.user?.id}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Awarded Banner */}
          {awardedContractor && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Package Awarded</p>
                <p className="text-sm text-green-700">
                  Awarded to{" "}
                  <span className="font-semibold">
                    {awardedContractor.name}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Package Summary</h2>
            {!awardedContractor && contractors.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={() => {
                          // Pre-select contractor with highest technical score
                          if (technicalRankings.length > 0) {
                            const highestScorer = technicalRankings[0]
                            // Only pre-select if they're eligible
                            if (
                              eligibleContractors.some(
                                (c) => c.id === highestScorer.id
                              )
                            ) {
                              setSelectedContractorId(highestScorer.id)
                            }
                          }
                          setAwardSheetOpen(true)
                        }}
                        disabled={!canAward}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Award Package
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {awardDisabledReason && (
                    <TooltipContent>
                      <p>{awardDisabledReason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Technical Evaluation Card */}
            {canViewTechnical && (
              <div className="border rounded-lg p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Technical Evaluation</h3>
                    <p className="text-sm text-muted-foreground">
                      Evaluate contractors on technical criteria
                    </p>
                  </div>
                </div>

                <Button
                  variant={hasTechEval ? "outline" : "default"}
                  className="mt-auto"
                  onClick={() =>
                    navigate({ to: "/package/$id/tech", params: { id } })
                  }
                >
                  {hasTechEval
                    ? "View Evaluations"
                    : "Start Technical Evaluation"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Commercial Evaluation Card */}
            {canViewCommercial && (
              <div className="border rounded-lg p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Commercial Evaluation</h3>
                    <p className="text-sm text-muted-foreground">
                      Evaluate contractors on commercial criteria per asset
                    </p>
                  </div>
                </div>

                {hasCommercialEval ? (
                  <Button
                    variant="outline"
                    className="mt-auto"
                    onClick={() =>
                      navigate({
                        to: "/package/$id/comm",
                        params: { id },
                      })
                    }
                  >
                    View Evaluations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="mt-auto"
                    onClick={() =>
                      navigate({
                        to: "/package/$id/comm",
                        params: { id },
                      })
                    }
                  >
                    Start Commercial Evaluation
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Evaluation Summaries */}
          {((canViewTechnical && technicalRankings.length > 0) ||
            (canViewCommercial && commercialRankings.length > 0)) && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Technical Summary */}
              {canViewTechnical &&
                technicalRankings.length > 0 &&
                latestTechEval && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">
                        Technical Rankings
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {latestTechEval.roundName}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {technicalRankings.map((contractor, index) => (
                        <div
                          key={contractor.id}
                          className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground w-5">
                              #{index + 1}
                            </span>
                            <span>{contractor.name}</span>
                          </div>
                          <span className="font-medium">
                            {contractor.score.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Commercial Summary */}
              {canViewCommercial && commercialRankings.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Commercial Rankings</h4>
                    <span className="text-xs text-muted-foreground">
                      Latest Round
                    </span>
                  </div>
                  <div className="space-y-2">
                    {commercialRankings.map((contractor, index) => (
                      <div
                        key={contractor.id}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground w-5">
                            #{index + 1}
                          </span>
                          <span>{contractor.name}</span>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(
                            contractor.total,
                            packageData.package.currency
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Award Package Sheet */}
      <Sheet open={awardSheetOpen} onOpenChange={setAwardSheetOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader className="px-6">
            <SheetTitle>Award Package</SheetTitle>
            <SheetDescription>
              Select a contractor to award this package to.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-6 px-6 space-y-6 overflow-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Contractor</label>
              <Select
                value={selectedContractorId}
                onValueChange={setSelectedContractorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleContractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only contractors with both technical and commercial evaluations
                are shown.
              </p>
            </div>

            {selectedContractor && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Evaluation Summary</h4>

                {/* Technical Summary */}
                {selectedTechRank > 0 && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">
                        Technical Evaluation
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rank</span>
                      <span className="font-medium">
                        #{selectedTechRank} of {technicalRankings.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">
                        {selectedTechScore?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Commercial Summary */}
                {selectedCommRank > 0 && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">
                        Commercial Evaluation
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rank</span>
                      <span className="font-medium">
                        #{selectedCommRank} of {commercialRankings.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Bid</span>
                      <span className="font-medium">
                        {formatCurrency(
                          selectedCommTotal ?? 0,
                          packageData.package.currency
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {selectedTechRank === 0 && selectedCommRank === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No evaluation data available for this contractor.
                  </p>
                )}
              </div>
            )}

            {/* Award Comments */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add any comments or justification for this award decision..."
                value={awardComments}
                onChange={(e) => setAwardComments(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter className="px-6">
            <Button
              variant="outline"
              onClick={() => {
                setAwardSheetOpen(false)
                setSelectedContractorId("")
                setAwardComments("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                awardPackage.mutate({
                  contractorId: selectedContractorId,
                  comments: awardComments,
                })
              }
              disabled={!selectedContractorId || awardPackage.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {awardPackage.isPending ? "Awarding..." : "Award"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Settings Dialog */}
      {canEdit && (
        <PackageSettingsDialog
          packageId={id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
      )}
    </>
  )
}
