import { useState, useMemo, Fragment } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  assetDetailQueryOptions,
  commercialEvaluationsQueryOptions,
  packageContractorsQueryOptions,
} from "@/lib/query-options"
import { createCommercialEvaluationFn, runCommercialEvaluationFn } from "@/fn"
import {
  normalizeContractorBids,
  DEFAULT_NORMALIZATION_SETTINGS,
} from "@/lib/mock-boq-data"
import useStore from "@/lib/store"
import type {
  CommercialEvaluationData,
  ContractorBid,
  NormalizationSettings,
  CustomOverrides,
  BOQLineItem,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  BarChart3,
  UserIcon,
  Link as LinkIcon,
  ChevronRight,
  Upload,
  Check,
  Settings2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { cn, formatCurrency } from "@/lib/utils"

type CommercialEvaluation = {
  id: string
  assetId: string
  roundNumber: number
  roundName: string
  data: CommercialEvaluationData | Record<string, never>
  createdAt: Date
  updatedAt: Date
}

export const Route = createFileRoute("/_app/package/$id/comm/$assetId/")({
  // Data prefetching handled by parent layout route
  component: RouteComponent,
})

function RouteComponent() {
  const { id, assetId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: assetData } = useSuspenseQuery(assetDetailQueryOptions(assetId))
  const { data: evaluations } = useSuspenseQuery(
    commercialEvaluationsQueryOptions(assetId)
  )
  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(id)
  )

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [uploadedContractors, setUploadedContractors] = useState<Set<string>>(
    new Set()
  )

  const evaluationsList = evaluations as CommercialEvaluation[]

  // Get round from Zustand store
  const selectedRoundId = useStore((s) => s.selectedCommRound[assetId])
  const setCommRound = useStore((s) => s.setCommRound)

  // Get current round
  const currentRound = selectedRoundId
    ? evaluationsList.find((e) => e.id === selectedRoundId)
    : evaluationsList[0]

  // Create and run evaluation (for "Start Commercial Evaluation" button)
  const createAndRunEvaluation = useMutation({
    mutationFn: async () => {
      // First create the evaluation
      const newEval = (await createCommercialEvaluationFn({
        data: { assetId },
      })) as CommercialEvaluation
      // Then run it to populate with data
      const result = await runCommercialEvaluationFn({
        data: { evaluationId: newEval.id },
      })
      return result as CommercialEvaluation
    },
    onSuccess: async (newEval) => {
      toast.success(`${newEval.roundName} created`)
      await queryClient.invalidateQueries({
        queryKey: commercialEvaluationsQueryOptions(assetId).queryKey,
      })
      setCommRound(assetId, newEval.id)
      setIsSetupOpen(false)
      setUploadedContractors(new Set())
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create evaluation"
      )
    },
  })

  const toggleContractorUpload = (contractorId: string) => {
    setUploadedContractors((prev) => {
      const next = new Set(prev)
      if (next.has(contractorId)) {
        next.delete(contractorId)
      } else {
        next.add(contractorId)
      }
      return next
    })
  }

  const handleOpenSetup = () => {
    setUploadedContractors(new Set())
    setIsSetupOpen(true)
  }

  const hasEvaluations = evaluationsList.length > 0
  const hasData = currentRound?.data && "boq" in currentRound.data

  // No contractors case
  if (contractors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <UserIcon className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No contractors</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Add contractors to this package before running a commercial
          evaluation.
        </p>
        <Button variant="outline" asChild>
          <a href={`/package/${id}/contractors?addContractor=true`}>
            <LinkIcon className="size-4 mr-2" />
            Go to Contractors
          </a>
        </Button>
      </div>
    )
  }

  // No evaluations yet - show setup sheet
  if (!hasEvaluations) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <BarChart3 className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No commercial evaluation yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start a commercial evaluation for{" "}
            <strong>{assetData.asset.name}</strong> to compare contractor
            proposals.
          </p>
          <Button onClick={handleOpenSetup}>Start Commercial Evaluation</Button>
        </div>

        <CommercialSetupSheet
          open={isSetupOpen}
          onOpenChange={setIsSetupOpen}
          contractors={contractors}
          uploadedContractors={uploadedContractors}
          onToggleContractor={toggleContractorUpload}
          onRunEvaluation={() => createAndRunEvaluation.mutate()}
          isPending={createAndRunEvaluation.isPending}
        />
      </>
    )
  }

  // Evaluation with data - show BOQ table
  if (hasData) {
    return (
      <BOQTable
        evaluationData={currentRound.data as CommercialEvaluationData}
      />
    )
  }

  // Fallback - show loading or empty state (shouldn't happen with new flow)
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <BarChart3 className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Loading...</h3>
    </div>
  )
}

// ============================================================================
// Commercial Setup Sheet
// ============================================================================

function CommercialSetupSheet({
  open,
  onOpenChange,
  contractors,
  uploadedContractors,
  onToggleContractor,
  onRunEvaluation,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractors: Array<{ id: string; name: string }>
  uploadedContractors: Set<string>
  onToggleContractor: (id: string) => void
  onRunEvaluation: () => void
  isPending: boolean
}) {
  const canRunEvaluation = uploadedContractors.size > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Upload Vendor Documents</SheetTitle>
          <SheetDescription>
            Upload commercial proposals from each contractor to run the
            evaluation.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {contractors.map((contractor) => {
            const isUploaded = uploadedContractors.has(contractor.id)
            return (
              <div
                key={contractor.id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <UserIcon size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{contractor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isUploaded ? "Document uploaded" : "No document uploaded"}
                  </p>
                </div>
                <Button
                  variant={isUploaded ? "outline" : "default"}
                  size="sm"
                  onClick={() => onToggleContractor(contractor.id)}
                >
                  {isUploaded ? (
                    <>
                      <Check className="size-4 mr-1" />
                      Uploaded
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-1" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onRunEvaluation}
            disabled={!canRunEvaluation || isPending}
          >
            {isPending ? "Running..." : "Run Evaluation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// BOQ Table Component
// ============================================================================

function BOQTable({
  evaluationData,
}: {
  evaluationData: CommercialEvaluationData
}) {
  const [viewMode, setViewMode] = useState<"received" | "normalized">(
    "received"
  )
  const [normalizationSettings, setNormalizationSettings] =
    useState<NormalizationSettings>(DEFAULT_NORMALIZATION_SETTINGS)
  const [customOverrides, setCustomOverrides] = useState<CustomOverrides>({})
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false)
  const [selectedIssueCell, setSelectedIssueCell] = useState<{
    contractorId: string
    itemId: string
    item: BOQLineItem
  } | null>(null)
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set()
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )

  const { boq, contractors: rawContractors } = evaluationData
  const isNormalized = viewMode === "normalized"
  const hasCustomOverrides = Object.keys(customOverrides).length > 0

  // Compute normalized contractors if needed
  const contractors = useMemo(() => {
    if (isNormalized) {
      return normalizeContractorBids(
        boq,
        rawContractors,
        normalizationSettings,
        customOverrides
      )
    }
    return rawContractors
  }, [
    isNormalized,
    boq,
    rawContractors,
    normalizationSettings,
    customOverrides,
  ])

  // Track issue types for each cell
  const cellIssues = useMemo(() => {
    const issues: Record<string, "included" | "unpriced" | "arithmetic_error"> =
      {}
    for (const contractor of rawContractors) {
      for (const itemId of contractor.includedItems ?? []) {
        issues[`${contractor.contractorId}-${itemId}`] = "included"
      }
      for (const itemId of Object.keys(contractor.arithmeticErrors ?? {})) {
        issues[`${contractor.contractorId}-${itemId}`] = "arithmetic_error"
      }
      for (const [itemId, price] of Object.entries(contractor.prices ?? {})) {
        const key = `${contractor.contractorId}-${itemId}`
        if (price === null && !issues[key]) {
          issues[key] = "unpriced"
        }
      }
    }
    return issues
  }, [rawContractors])

  // The lowest bidder is always index 0 (contractors are pre-sorted)
  const lowestBidderId = contractors[0]?.contractorId

  const toggleDivision = (divId: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev)
      if (next.has(divId)) {
        next.delete(divId)
      } else {
        next.add(divId)
      }
      return next
    })
  }

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(secId)) {
        next.delete(secId)
      } else {
        next.add(secId)
      }
      return next
    })
  }

  // Calculate subtotals for divisions and sections
  const calculateSubtotal = (
    itemIds: string[],
    contractor: ContractorBid
  ): number => {
    return itemIds.reduce((sum, itemId) => {
      const price = contractor.prices[itemId]
      return sum + (price ?? 0)
    }, 0)
  }

  // Helper to get column styling for lowest bidder
  const getColumnClass = (contractorId: string, baseClass: string = "") => {
    const isLowest = contractorId === lowestBidderId
    return cn(baseClass, isLowest && "bg-emerald-50/80 dark:bg-emerald-950/30")
  }

  // Handle cell click for issues
  const handleCellClick = (
    contractorId: string,
    itemId: string,
    item: BOQLineItem
  ) => {
    const key = `${contractorId}-${itemId}`
    const issue = cellIssues[key]
    // Only open sheet for clickable issues in normalized view (not "included")
    if (isNormalized && issue && issue !== "included") {
      setSelectedIssueCell({ contractorId, itemId, item })
    }
  }

  // Handle custom override save
  const handleSaveOverride = (value: string) => {
    if (!selectedIssueCell) return
    const key = `${selectedIssueCell.contractorId}-${selectedIssueCell.itemId}`

    if (value === "" || value === undefined) {
      // Remove override if empty
      setCustomOverrides((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setCustomOverrides((prev) => ({
          ...prev,
          [key]: numValue,
        }))
      }
    }
    setSelectedIssueCell(null)
  }

  // Revert all custom overrides
  const handleRevertOverrides = () => {
    setCustomOverrides({})
    toast.success("Custom values reverted")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-8 bg-background sticky top-0 z-10">
        <h2 className="text-base font-semibold">Asset Summary</h2>
        <div className="flex items-center gap-2">
          {/* Revert custom values button */}
          {hasCustomOverrides && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevertOverrides}
              className="text-xs h-8"
            >
              <RotateCcw className="size-3.5 mr-1.5" />
              Revert custom values
            </Button>
          )}

          {/* Button group toggle */}
          <div className="flex items-center rounded-lg bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("received")}
              className={cn(
                "h-7 text-xs font-medium rounded-md px-3 transition-colors",
                viewMode === "received"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Bids as received
            </button>
            <button
              type="button"
              onClick={() => setViewMode("normalized")}
              className={cn(
                "h-7 text-xs font-medium rounded-md px-3 transition-colors",
                viewMode === "normalized"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Normalized
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsSheetOpen(true)}
              className="h-7 px-2 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
              title="Normalization settings"
            >
              <Settings2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="w-full max-w-6xl mx-auto rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-auto p-2">
            <table className="w-full min-w-[860px] border-collapse text-xs">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <tr>
                  <th className="text-left px-2 py-1.5 border-b font-medium text-muted-foreground w-20">
                    Code
                  </th>
                  <th className="text-left px-2 py-1.5 border-b font-medium text-muted-foreground min-w-[180px]">
                    Description
                  </th>
                  <th className="text-right px-2 py-1.5 border-b font-medium text-muted-foreground w-16">
                    Qty
                  </th>
                  <th className="text-left px-2 py-1.5 border-b font-medium text-muted-foreground w-12">
                    Unit
                  </th>
                  {contractors.map((contractor, idx) => {
                    const isLowest = contractor.contractorId === lowestBidderId
                    return (
                      <th
                        key={contractor.contractorId}
                        className={cn(
                          "text-right px-2 py-1.5 border-b font-medium min-w-[100px]",
                          isLowest && "bg-emerald-100/80 dark:bg-emerald-900/40"
                        )}
                      >
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={cn(
                              "truncate max-w-[100px] text-xs",
                              isLowest &&
                                "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {contractor.contractorName}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-normal",
                              isLowest
                                ? "text-emerald-600 dark:text-emerald-500"
                                : "text-muted-foreground"
                            )}
                          >
                            {isLowest ? "#1 Lowest" : `#${idx + 1}`}
                          </span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {boq.divisions.map((division) => {
                  const isDivExpanded = expandedDivisions.has(division.id)
                  const divisionItemIds = division.sections.flatMap((s) =>
                    s.lineItems.map((li) => li.id)
                  )

                  return (
                    <Fragment key={division.id}>
                      {/* Division Row */}
                      <tr
                        className="bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors"
                        onClick={() => toggleDivision(division.id)}
                      >
                        <td className="px-2 py-1.5 border-b font-semibold text-xs">
                          <div className="flex items-center gap-1">
                            <ChevronRight
                              className={cn(
                                "size-3.5 transition-transform text-muted-foreground",
                                isDivExpanded && "rotate-90"
                              )}
                            />
                            {division.code}
                          </div>
                        </td>
                        <td
                          className="px-2 py-1.5 border-b font-semibold text-xs"
                          colSpan={3}
                        >
                          {division.name}
                        </td>
                        {contractors.map((contractor) => (
                          <td
                            key={contractor.contractorId}
                            className={cn(
                              "px-2 py-1.5 border-b text-right font-semibold tabular-nums",
                              getColumnClass(contractor.contractorId)
                            )}
                          >
                            {formatCurrency(
                              calculateSubtotal(divisionItemIds, contractor)
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* Sections (when division expanded) */}
                      {isDivExpanded &&
                        division.sections.map((section) => {
                          const isSecExpanded = expandedSections.has(section.id)
                          const sectionItemIds = section.lineItems.map(
                            (li) => li.id
                          )

                          return (
                            <Fragment key={section.id}>
                              {/* Section Row */}
                              <tr
                                className="bg-accent/10 cursor-pointer hover:bg-accent/20 transition-colors"
                                onClick={() => toggleSection(section.id)}
                              >
                                <td className="px-2 py-1 border-b pl-5 font-medium text-xs">
                                  <div className="flex items-center gap-1">
                                    <ChevronRight
                                      className={cn(
                                        "size-3 transition-transform text-muted-foreground",
                                        isSecExpanded && "rotate-90"
                                      )}
                                    />
                                    {section.code}
                                  </div>
                                </td>
                                <td
                                  className="px-2 py-1 border-b font-medium text-xs"
                                  colSpan={3}
                                >
                                  {section.name}
                                </td>
                                {contractors.map((contractor) => (
                                  <td
                                    key={contractor.contractorId}
                                    className={cn(
                                      "px-2 py-1 border-b text-right font-medium tabular-nums",
                                      getColumnClass(contractor.contractorId)
                                    )}
                                  >
                                    {formatCurrency(
                                      calculateSubtotal(
                                        sectionItemIds,
                                        contractor
                                      )
                                    )}
                                  </td>
                                ))}
                              </tr>

                              {/* Line Items (when section expanded) */}
                              {isSecExpanded &&
                                section.lineItems.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-accent/30 transition-colors"
                                  >
                                    <td className="px-2 py-1 border-b pl-8 text-muted-foreground text-[11px]">
                                      {item.code}
                                    </td>
                                    <td className="px-2 py-1 border-b text-[11px]">
                                      {item.description}
                                    </td>
                                    <td className="px-2 py-1 border-b text-right tabular-nums text-[11px]">
                                      {item.quantity.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1 border-b text-muted-foreground text-[11px]">
                                      {item.unit}
                                    </td>
                                    {contractors.map((contractor) => {
                                      const rawContractor = rawContractors.find(
                                        (c) =>
                                          c.contractorId ===
                                          contractor.contractorId
                                      )!
                                      const key = `${contractor.contractorId}-${item.id}`
                                      const issue = cellIssues[key]
                                      const hasCustomOverride =
                                        customOverrides[key] !== undefined
                                      const price = contractor.prices[item.id]
                                      const isLowest =
                                        contractor.contractorId ===
                                        lowestBidderId
                                      const isClickable =
                                        isNormalized &&
                                        issue &&
                                        issue !== "included"

                                      // Determine cell styling
                                      const getCellStyles = () => {
                                        // Custom override styling (purple)
                                        if (isNormalized && hasCustomOverride) {
                                          return "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 cursor-pointer"
                                        }
                                        // Included items (gray)
                                        if (issue === "included") {
                                          return "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
                                        }
                                        // Arithmetic error - as received (orange/red with warning)
                                        if (
                                          issue === "arithmetic_error" &&
                                          !isNormalized
                                        ) {
                                          return "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
                                        }
                                        // Arithmetic error - normalized (blue, clickable)
                                        if (
                                          issue === "arithmetic_error" &&
                                          isNormalized
                                        ) {
                                          return "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 italic cursor-pointer"
                                        }
                                        // Unpriced - as received (amber)
                                        if (
                                          issue === "unpriced" &&
                                          !isNormalized
                                        ) {
                                          return "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                                        }
                                        // Unpriced - normalized (blue, clickable)
                                        if (
                                          issue === "unpriced" &&
                                          isNormalized
                                        ) {
                                          return "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 italic cursor-pointer"
                                        }
                                        // Lowest bidder highlight
                                        if (isLowest) {
                                          return "bg-emerald-50/80 dark:bg-emerald-950/30"
                                        }
                                        return ""
                                      }

                                      // Render cell content
                                      const renderCellContent = () => {
                                        // Included items always show "Included"
                                        if (issue === "included") {
                                          return (
                                            <span className="text-[10px]">
                                              Included
                                            </span>
                                          )
                                        }
                                        // Arithmetic error in "as received" view - show with warning icon
                                        if (
                                          issue === "arithmetic_error" &&
                                          !isNormalized
                                        ) {
                                          const error =
                                            rawContractor.arithmeticErrors?.[
                                              item.id
                                            ]
                                          if (error) {
                                            return (
                                              <span className="flex items-center justify-end gap-1">
                                                <AlertTriangle className="size-3" />
                                                {formatCurrency(
                                                  error.submitted
                                                )}
                                              </span>
                                            )
                                          }
                                        }
                                        // Unpriced in "as received" view
                                        if (
                                          issue === "unpriced" &&
                                          !isNormalized
                                        ) {
                                          return "—"
                                        }
                                        // Show price (normalized value, custom override, or original)
                                        return price !== null
                                          ? formatCurrency(price)
                                          : "—"
                                      }

                                      return (
                                        <td
                                          key={contractor.contractorId}
                                          className={cn(
                                            "px-2 py-1 border-b text-right tabular-nums text-[11px]",
                                            getCellStyles()
                                          )}
                                          onClick={() =>
                                            isClickable &&
                                            handleCellClick(
                                              contractor.contractorId,
                                              item.id,
                                              item
                                            )
                                          }
                                        >
                                          {renderCellContent()}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                            </Fragment>
                          )
                        })}
                    </Fragment>
                  )
                })}

                {/* Grand Total Row */}
                <tr className="bg-accent/20 font-bold">
                  <td className="px-2 py-2 border-t-2 text-xs" colSpan={4}>
                    Grand Total
                  </td>
                  {contractors.map((contractor) => {
                    const isLowest = contractor.contractorId === lowestBidderId
                    return (
                      <td
                        key={contractor.contractorId}
                        className={cn(
                          "px-2 py-2 border-t-2 text-right tabular-nums text-xs",
                          isLowest &&
                            "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                        )}
                      >
                        {formatCurrency(contractor.totalAmount)}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Normalization Settings Sheet */}
      <NormalizationSettingsSheet
        open={isSettingsSheetOpen}
        onOpenChange={setIsSettingsSheetOpen}
        settings={normalizationSettings}
        onSettingsChange={setNormalizationSettings}
      />

      {/* Item Issue Sheet */}
      <ItemIssueSheet
        open={selectedIssueCell !== null}
        onOpenChange={(open) => !open && setSelectedIssueCell(null)}
        cellInfo={selectedIssueCell}
        rawContractors={rawContractors}
        contractors={contractors}
        cellIssues={cellIssues}
        customOverrides={customOverrides}
        normalizationSettings={normalizationSettings}
        onSave={handleSaveOverride}
      />
    </div>
  )
}

// ============================================================================
// Normalization Settings Sheet
// ============================================================================

function NormalizationSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: NormalizationSettings
  onSettingsChange: (settings: NormalizationSettings) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Normalization Settings</SheetTitle>
          <SheetDescription>
            Configure how prices are normalized for comparison.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          {/* Issues to Normalize */}
          <div className="space-y-4">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Issues to Normalize
            </Label>
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="normalize-unpriced"
                  checked={settings.normalizeUnpriced}
                  onCheckedChange={(checked) =>
                    onSettingsChange({
                      ...settings,
                      normalizeUnpriced: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor="normalize-unpriced"
                  className="text-sm font-normal cursor-pointer"
                >
                  Unpriced Items
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="normalize-arithmetic"
                  checked={settings.normalizeArithmeticErrors}
                  onCheckedChange={(checked) =>
                    onSettingsChange({
                      ...settings,
                      normalizeArithmeticErrors: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor="normalize-arithmetic"
                  className="text-sm font-normal cursor-pointer"
                >
                  Arithmetic Errors
                </Label>
              </div>
            </div>
          </div>

          {/* Algorithm Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Normalization Algorithm
            </Label>
            <Select
              value={settings.algorithm}
              onValueChange={(value: "median" | "lowest") =>
                onSettingsChange({ ...settings, algorithm: value })
              }
            >
              <SelectTrigger className="w-full h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="median">Median Price</SelectItem>
                <SelectItem value="lowest">Lowest Price</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.algorithm === "median"
                ? "Missing or erroneous prices will be replaced with the median price from other contractors."
                : "Missing or erroneous prices will be replaced with the lowest price from other contractors."}
            </p>
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t bg-muted/30">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Item Issue Sheet
// ============================================================================

function ItemIssueSheet({
  open,
  onOpenChange,
  cellInfo,
  rawContractors,
  contractors,
  cellIssues,
  customOverrides,
  normalizationSettings,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cellInfo: { contractorId: string; itemId: string; item: BOQLineItem } | null
  rawContractors: ContractorBid[]
  contractors: ContractorBid[]
  cellIssues: Record<string, "included" | "unpriced" | "arithmetic_error">
  customOverrides: CustomOverrides
  normalizationSettings: NormalizationSettings
  onSave: (value: string) => void
}) {
  const [customValue, setCustomValue] = useState("")

  // Reset custom value when sheet opens
  const key = cellInfo ? `${cellInfo.contractorId}-${cellInfo.itemId}` : ""
  const existingOverride = customOverrides[key]

  // Update local state when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && existingOverride !== undefined) {
      setCustomValue(existingOverride.toString())
    } else if (newOpen) {
      setCustomValue("")
    }
    onOpenChange(newOpen)
  }

  if (!cellInfo) return null

  const { contractorId, itemId, item } = cellInfo
  const issue = cellIssues[key]
  const rawContractor = rawContractors.find(
    (c) => c.contractorId === contractorId
  )
  const normalizedContractor = contractors.find(
    (c) => c.contractorId === contractorId
  )
  const normalizedPrice = normalizedContractor?.prices[itemId]

  const getIssueDescription = () => {
    if (issue === "unpriced") {
      return "This item was not priced by the contractor."
    }
    if (issue === "arithmetic_error" && rawContractor) {
      const error = rawContractor.arithmeticErrors?.[itemId]
      if (error) {
        return `Arithmetic error detected: Submitted ${formatCurrency(error.submitted)}, but calculated value is ${formatCurrency(error.calculated)}.`
      }
    }
    return ""
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Price Override</SheetTitle>
          <SheetDescription>{rawContractor?.contractorName}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">
          {/* Item Details */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Item
            </Label>
            <div className="p-4 rounded-lg border bg-card">
              <p className="font-medium text-sm">{item.description}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {item.code}
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span>
                  {item.quantity.toLocaleString()} {item.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Issue
            </Label>
            <div
              className={cn(
                "p-4 rounded-lg text-sm border-l-4",
                issue === "unpriced" &&
                  "bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-amber-800 dark:text-amber-200",
                issue === "arithmetic_error" &&
                  "bg-orange-50 dark:bg-orange-950/30 border-orange-400 text-orange-800 dark:text-orange-200"
              )}
            >
              {getIssueDescription()}
            </div>
          </div>

          {/* Current Normalized Price */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Normalized Price (
              {normalizationSettings.algorithm === "median"
                ? "Median"
                : "Lowest"}
              )
            </Label>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <span className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                {normalizedPrice !== null
                  ? formatCurrency(normalizedPrice)
                  : "—"}
              </span>
            </div>
          </div>

          {/* Custom Override */}
          <div className="space-y-3 pt-2 border-t">
            <Label
              htmlFor="custom-price"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Override with Custom Price
            </Label>
            <Input
              id="custom-price"
              type="number"
              placeholder="Enter custom price..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="w-full h-11 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the normalized value above.
            </p>
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(customValue)}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
