import { useState, useEffect } from "react"
import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
  useNavigate,
} from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  packageDetailQueryOptions,
  packageContractorsQueryOptions,
  commercialEvaluationsQueryOptions,
} from "@/lib/query-options"
import {
  createAssetFn,
  createCommercialEvaluationFn,
  runCommercialEvaluationFn,
} from "@/fn"
import useStore from "@/lib/store"
import type { CommercialEvaluationData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Upload, Check, ChevronDown, UserIcon } from "lucide-react"
import { toast } from "sonner"

type CommercialEvaluation = {
  id: string
  assetId: string
  roundNumber: number
  roundName: string
  data: CommercialEvaluationData
  createdAt: Date
  updatedAt: Date
}

export const Route = createFileRoute("/_app/package/$id/comm")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageContractorsQueryOptions(params.id))
  },
  component: RouteComponent,
})

const sidebarLinkClass = "nav-item nav-item-light"
const sidebarLinkActiveClass = "active"

function RouteComponent() {
  const { id } = Route.useParams()
  const matches = useMatches()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: packageData } = useSuspenseQuery(packageDetailQueryOptions(id))
  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(id)
  )
  const assets = packageData?.assets ?? []

  // Get the currently selected assetId from URL
  const currentAssetId = matches
    .map((m) => (m.params as { assetId?: string }).assetId)
    .find((assetId) => assetId)

  // Get the current asset if we have one
  const currentAsset = currentAssetId
    ? assets.find((a) => a.id === currentAssetId)
    : null

  // Create asset sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [assetName, setAssetName] = useState("")
  const [boqUploaded, setBoqUploaded] = useState(false)
  const [pteUploaded, setPteUploaded] = useState(false)

  const createAsset = useMutation({
    mutationFn: (name: string) =>
      createAssetFn({ data: { packageId: id, name } }),
    onSuccess: (newAsset) => {
      toast.success("Asset created successfully")
      queryClient.invalidateQueries({
        queryKey: packageDetailQueryOptions(id).queryKey,
      })
      setIsSheetOpen(false)
      resetForm()
      navigate({
        to: "/package/$id/comm/$assetId",
        params: { id, assetId: newAsset.id },
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create asset"
      )
    },
  })

  const resetForm = () => {
    setAssetName("")
    setBoqUploaded(false)
    setPteUploaded(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = assetName.trim()
    if (!trimmedName) {
      toast.error("Asset name is required")
      return
    }
    if (!boqUploaded) {
      toast.error("BOQ file is required")
      return
    }
    createAsset.mutate(trimmedName)
  }

  // Determine which sidebar to show based on whether we're viewing an asset
  const isInAssetView = !!currentAssetId

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <aside className="w-72 bg-white pb-4 px-[28px] overflow-auto space-y-6 border-r-[0.5px] border-black/15">
        {isInAssetView && currentAsset ? (
          // Asset view sidebar
          <AssetSidebar
            packageId={id}
            assetId={currentAssetId}
            assetName={currentAsset.name}
            contractors={contractors}
          />
        ) : (
          // Package summary sidebar
          <PackageSidebar
            packageId={id}
            assets={assets}
            onNewAsset={() => setIsSheetOpen(true)}
          />
        )}
      </aside>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create New Asset</SheetTitle>
            <SheetDescription>
              Add a new asset to this package with BOQ and optional PTE files.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input
                id="asset-name"
                placeholder="e.g. HVAC System"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                disabled={createAsset.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>BOQ File (Required)</Label>
              <Button
                type="button"
                variant={boqUploaded ? "outline" : "default"}
                className="w-full gap-2"
                onClick={() => setBoqUploaded(!boqUploaded)}
                disabled={createAsset.isPending}
              >
                {boqUploaded ? (
                  <>
                    <Check className="size-4" />
                    BOQ Uploaded
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload BOQ
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>PTE File (Optional)</Label>
              <Button
                type="button"
                variant={pteUploaded ? "outline" : "secondary"}
                className="w-full gap-2"
                onClick={() => setPteUploaded(!pteUploaded)}
                disabled={createAsset.isPending}
              >
                {pteUploaded ? (
                  <>
                    <Check className="size-4" />
                    PTE Uploaded
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload PTE
                  </>
                )}
              </Button>
            </div>
          </form>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSheetOpen(false)
                resetForm()
              }}
              disabled={createAsset.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createAsset.isPending || !assetName.trim() || !boqUploaded
              }
            >
              {createAsset.isPending ? "Creating..." : "Create Asset"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ============================================================================
// Package Summary Sidebar
// ============================================================================

function PackageSidebar({
  packageId,
  assets,
  onNewAsset,
}: {
  packageId: string
  assets: Array<{ id: string; name: string }>
  onNewAsset: () => void
}) {
  return (
    <>
      {/* Title */}
      <h2 className="text-[16px] font-semibold text-gradient my-8 w-fit">
        Commercial Evaluation
      </h2>

      {/* Nav links */}
      <div className="flex flex-col gap-px">
        <Link
          to="/package/$id/comm"
          params={{ id: packageId }}
          activeOptions={{ exact: true }}
          className={sidebarLinkClass}
          activeProps={{
            className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
          }}
        >
          Package summary
        </Link>

        {assets.map((asset) => (
          <Link
            key={asset.id}
            to="/package/$id/comm/$assetId"
            params={{ id: packageId, assetId: asset.id }}
            className={sidebarLinkClass}
            activeProps={{
              className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
            }}
          >
            {asset.name}
          </Link>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 mt-2"
          onClick={onNewAsset}
        >
          <Plus className="size-4" />
          New Asset
        </Button>
      </div>
    </>
  )
}

// ============================================================================
// Asset View Sidebar
// ============================================================================

function AssetSidebar({
  packageId,
  assetId,
  assetName,
  contractors,
}: {
  packageId: string
  assetId: string
  assetName: string
  contractors: Array<{ id: string; name: string }>
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Get evaluations for this asset
  const { data: evaluations } = useSuspenseQuery(
    commercialEvaluationsQueryOptions(assetId)
  )
  const evaluationsList = evaluations as CommercialEvaluation[]

  // Get/set round from Zustand store
  const selectedRoundId = useStore((s) => s.selectedCommRound[assetId])
  const setCommRound = useStore((s) => s.setCommRound)

  // State for setup sheet
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [uploadedContractors, setUploadedContractors] = useState<Set<string>>(
    new Set()
  )

  // Auto-select latest round when no round is stored or stored round is invalid
  useEffect(() => {
    if (evaluationsList.length > 0) {
      const storedRoundValid =
        selectedRoundId && evaluationsList.some((e) => e.id === selectedRoundId)
      if (!storedRoundValid) {
        setCommRound(assetId, evaluationsList[0].id)
      }
    }
  }, [evaluationsList, selectedRoundId, setCommRound, assetId])

  // Get current round
  const currentRound = selectedRoundId
    ? evaluationsList.find((e) => e.id === selectedRoundId)
    : evaluationsList[0]

  const hasEvaluations = evaluationsList.length > 0

  // Create new round with data
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
      // Navigate to the asset summary page
      navigate({
        to: "/package/$id/comm/$assetId",
        params: { id: packageId, assetId },
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create round"
      )
    },
  })

  const handleRoundSelect = (roundId: string) => {
    setCommRound(assetId, roundId)
  }

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

  return (
    <>
      {/* Asset name title */}
      <h2
        className="text-[16px] font-semibold text-gradient my-8 w-fit max-w-full truncate"
        title={assetName}
      >
        {assetName}
      </h2>

      {/* Round dropdown - only show if there are evaluations */}
      {hasEvaluations && (
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
            {evaluationsList.map((evaluation) => (
              <DropdownMenuItem
                key={evaluation.id}
                onClick={() => handleRoundSelect(evaluation.id)}
              >
                {evaluation.roundName}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenSetup}>
              <Plus className="size-4 mr-2" />
              New Round
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Nav links */}
      <div className="flex flex-col gap-px">
        <Link
          to="/package/$id/comm/$assetId"
          params={{ id: packageId, assetId }}
          activeOptions={{ exact: true }}
          className={sidebarLinkClass}
          activeProps={{
            className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
          }}
        >
          Asset summary
        </Link>

        <Link
          to="/package/$id/comm/$assetId/ptc"
          params={{ id: packageId, assetId }}
          className={sidebarLinkClass}
          activeProps={{
            className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
          }}
        >
          PTC Insights
        </Link>

        <Link
          to="/package/$id/comm/$assetId/docs"
          params={{ id: packageId, assetId }}
          className={sidebarLinkClass}
          activeProps={{
            className: `${sidebarLinkClass} ${sidebarLinkActiveClass}`,
          }}
        >
          Documents
        </Link>
      </div>

      {/* Commercial Setup Sheet */}
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
