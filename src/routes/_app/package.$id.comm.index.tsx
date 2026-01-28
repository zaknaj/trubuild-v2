import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  packageDetailQueryOptions,
  packageCommercialSummaryQueryOptions,
} from "@/lib/query-options"
import { FileText, Plus, BarChart3 } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import type { CommercialEvaluationData } from "@/lib/types"

export const Route = createFileRoute("/_app/package/$id/comm/")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(
      packageCommercialSummaryQueryOptions(params.id)
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: summaryData } = useSuspenseQuery(
    packageCommercialSummaryQueryOptions(id)
  )

  const assets = packageData?.assets ?? []

  // Aggregate contractor data across all assets
  const { sortedContractors, assetBids, hasAnyEvaluation } = useMemo(() => {
    const contractorTotals = new Map<
      string,
      { id: string; name: string; total: number }
    >()
    const assetBidsMap = new Map<string, Map<string, number>>()

    let hasEval = false

    for (const asset of summaryData.assets) {
      const evaluation = asset.evaluation as CommercialEvaluationData | null
      if (!evaluation) continue

      hasEval = true
      const bidsForAsset = new Map<string, number>()

      for (const contractor of evaluation.contractors) {
        bidsForAsset.set(contractor.contractorId, contractor.totalAmount)

        const existing = contractorTotals.get(contractor.contractorId)
        if (existing) {
          existing.total += contractor.totalAmount
        } else {
          contractorTotals.set(contractor.contractorId, {
            id: contractor.contractorId,
            name: contractor.contractorName,
            total: contractor.totalAmount,
          })
        }
      }

      assetBidsMap.set(asset.id, bidsForAsset)
    }

    // Sort contractors by total (lowest first)
    const sorted = Array.from(contractorTotals.values()).sort(
      (a, b) => a.total - b.total
    )

    return {
      sortedContractors: sorted,
      assetBids: assetBidsMap,
      hasAnyEvaluation: hasEval,
    }
  }, [summaryData.assets])

  // Find lowest bid for each asset row
  const getLowestBidForAsset = (assetId: string): string | null => {
    const bids = assetBids.get(assetId)
    if (!bids || bids.size === 0) return null

    let lowestId: string | null = null
    let lowestAmount = Infinity

    for (const [contractorId, amount] of bids) {
      if (amount < lowestAmount) {
        lowestAmount = amount
        lowestId = contractorId
      }
    }

    return lowestId
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create an asset to start running commercial evaluations for this
          package.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the <Plus className="inline size-3" /> <strong>New Asset</strong>{" "}
          button in the sidebar to get started.
        </p>
      </div>
    )
  }

  if (!hasAnyEvaluation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <BarChart3 className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No evaluations yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Run commercial evaluations on individual assets to see the package
          summary.
        </p>
      </div>
    )
  }

  // The lowest bidder is always index 0 (sorted by total)
  const lowestBidderId = sortedContractors[0]?.id

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-8 bg-background sticky top-0 z-10">
        <h2 className="text-base font-semibold">Commercial Summary</h2>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="w-full max-w-6xl mx-auto rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-auto p-2">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <tr>
                  <th className="text-left px-2 py-1.5 border-b font-medium text-muted-foreground min-w-[160px] sticky left-0 bg-background/95 backdrop-blur-sm z-20">
                    Asset
                  </th>
                  {sortedContractors.map((contractor, idx) => {
                    const isLowest = contractor.id === lowestBidderId
                    return (
                      <th
                        key={contractor.id}
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
                            {contractor.name}
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
                {summaryData.assets.map((asset) => {
                  const bids = assetBids.get(asset.id)
                  const lowestBidIdForAsset = getLowestBidForAsset(asset.id)
                  const hasEvaluation = asset.evaluation !== null

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-2 py-1.5 border-b font-medium sticky left-0 bg-card text-xs">
                        {asset.name}
                      </td>
                      {sortedContractors.map((contractor) => {
                        const bid = bids?.get(contractor.id)
                        const isLowestForAsset =
                          contractor.id === lowestBidIdForAsset
                        const isLowestOverall = contractor.id === lowestBidderId

                        return (
                          <td
                            key={contractor.id}
                            className={cn(
                              "px-2 py-1.5 border-b text-right tabular-nums",
                              isLowestOverall &&
                                "bg-emerald-50/80 dark:bg-emerald-950/30",
                              isLowestForAsset &&
                                "text-emerald-700 dark:text-emerald-400 font-medium"
                            )}
                          >
                            {hasEvaluation && bid !== undefined
                              ? formatCurrency(bid)
                              : "—"}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Total Row */}
                <tr className="bg-accent/20 font-bold">
                  <td className="px-2 py-2 border-t-2 sticky left-0 bg-accent/20 text-xs">
                    Total
                  </td>
                  {sortedContractors.map((contractor) => {
                    const isLowest = contractor.id === lowestBidderId
                    return (
                      <td
                        key={contractor.id}
                        className={cn(
                          "px-2 py-2 border-t-2 text-right tabular-nums text-xs",
                          isLowest &&
                            "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                        )}
                      >
                        {formatCurrency(contractor.total)}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
