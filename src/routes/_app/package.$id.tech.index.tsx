import { useState, useEffect, Fragment } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  technicalEvaluationDetailQueryOptions,
  packageContractorsQueryOptions,
} from "@/lib/query-options"
import { updateTechnicalEvaluationFn } from "@/fn"
import useStore from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import {
  Check,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  FileText,
  Pencil,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  type Breakdown,
  type TechnicalEvaluationData,
  type Evidence,
  type EvidenceFile,
  type LineReference,
} from "@/components/TechSetupWizard"

export const Route = createFileRoute("/_app/package/$id/tech/")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(packageContractorsQueryOptions(params.id))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { id: packageId } = Route.useParams()

  // Get round from Zustand store
  const evaluationId = useStore((s) => s.selectedTechRound[packageId])

  const { data: contractors } = useSuspenseQuery(
    packageContractorsQueryOptions(packageId)
  )

  if (!evaluationId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Select or create an evaluation round
        </p>
      </div>
    )
  }

  return (
    <EvaluationContent evaluationId={evaluationId} contractors={contractors} />
  )
}

function EvaluationContent({
  evaluationId,
  contractors,
}: {
  evaluationId: string
  contractors: Array<{ id: string; name: string }>
}) {
  const { data: evaluation } = useSuspenseQuery(
    technicalEvaluationDetailQueryOptions(evaluationId)
  ) as { data: { id: string; data: unknown } }

  const evalData = (evaluation.data ?? {}) as Partial<TechnicalEvaluationData>
  const status = evalData.status ?? "analyzing"

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [initialCell, setInitialCell] = useState<{
    contractorId: string
    breakdownId: string
  } | null>(null)

  const handleOpenReview = (contractorId?: string, breakdownId?: string) => {
    if (contractorId && breakdownId) {
      setInitialCell({ contractorId, breakdownId })
    } else {
      setInitialCell(null)
    }
    setIsReviewOpen(true)
  }

  if (status === "analyzing") {
    return <AnalyzingState />
  }

  if (status === "ready" || status === "review_complete") {
    return (
      <>
        <ScoresTable
          evalData={evalData as TechnicalEvaluationData}
          contractors={contractors}
          onOpenReview={handleOpenReview}
        />
        <ReviewSheet
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          evaluationId={evaluationId}
          evalData={evalData as TechnicalEvaluationData}
          contractors={contractors}
          initialCell={initialCell}
        />
      </>
    )
  }

  // Fallback - shouldn't happen with new flow
  return <AnalyzingState />
}

// ============================================================================
// Analyzing State
// ============================================================================

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <Spinner className="size-12 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Analyzing Proposals</h3>
      <p className="text-muted-foreground max-w-sm">
        Extracting and scoring contractor proposals against evaluation
        criteria...
      </p>
    </div>
  )
}

// ============================================================================
// Evidence Section
// ============================================================================

function EvidenceSection({
  evidence,
  onChange,
}: {
  evidence: Evidence[]
  onChange: (evidence: Evidence[]) => void
}) {
  const [isAddingEvidence, setIsAddingEvidence] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAddEvidence = (newEvidence: Omit<Evidence, "id" | "source">) => {
    onChange([
      ...evidence,
      {
        ...newEvidence,
        id: crypto.randomUUID(),
        source: "manual",
      },
    ])
    setIsAddingEvidence(false)
  }

  const handleUpdateEvidence = (id: string, updates: Partial<Evidence>) => {
    onChange(evidence.map((e) => (e.id === id ? { ...e, ...updates } : e)))
    setEditingId(null)
  }

  const handleDeleteEvidence = (id: string) => {
    onChange(evidence.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Evidence{" "}
          <span className="text-muted-foreground">({evidence.length})</span>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingEvidence(true)}
          disabled={isAddingEvidence}
        >
          <Plus className="size-4 mr-1" />
          Add
        </Button>
      </div>

      {isAddingEvidence && (
        <EvidenceForm
          onSave={handleAddEvidence}
          onCancel={() => setIsAddingEvidence(false)}
        />
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {evidence.map((item) => (
          <EvidenceItem
            key={item.id}
            evidence={item}
            isEditing={editingId === item.id}
            onEdit={() => setEditingId(item.id)}
            onUpdate={(updates) => handleUpdateEvidence(item.id, updates)}
            onDelete={() => handleDeleteEvidence(item.id)}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
        {evidence.length === 0 && !isAddingEvidence && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No evidence added yet
          </p>
        )}
      </div>
    </div>
  )
}

function EvidenceItem({
  evidence,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onCancelEdit,
}: {
  evidence: Evidence
  isEditing: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<Evidence>) => void
  onDelete: () => void
  onCancelEdit: () => void
}) {
  if (isEditing) {
    return (
      <EvidenceForm
        initialData={evidence}
        onSave={(data) => onUpdate(data)}
        onCancel={onCancelEdit}
      />
    )
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm flex-1">{evidence.text}</p>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              evidence.source === "auto"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {evidence.source === "auto" ? "Auto" : "Manual"}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {(evidence.files.length > 0 || evidence.lineReference) && (
        <div className="flex flex-wrap items-center gap-2">
          {evidence.files.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
            >
              <FileText className="size-3" />
              {file.name}
            </span>
          ))}
          {evidence.lineReference && (
            <span className="text-xs text-muted-foreground">
              {evidence.lineReference.fileName}:
              {evidence.lineReference.startLine}
              {evidence.lineReference.endLine
                ? `-${evidence.lineReference.endLine}`
                : ""}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function EvidenceForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Evidence
  onSave: (data: Omit<Evidence, "id" | "source">) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialData?.text ?? "")
  const [files, setFiles] = useState<EvidenceFile[]>(initialData?.files ?? [])
  const [lineRef, setLineRef] = useState<LineReference | undefined>(
    initialData?.lineReference
  )
  const [newFileName, setNewFileName] = useState("")

  const handleAddFile = () => {
    if (!newFileName.trim()) return
    setFiles([
      ...files,
      {
        id: crypto.randomUUID(),
        name: newFileName.trim(),
        fakeUrl: `/uploads/${newFileName.trim()}`,
      },
    ])
    setNewFileName("")
  }

  const handleRemoveFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id))
  }

  const handleSubmit = () => {
    if (!text.trim()) return
    onSave({
      text: text.trim(),
      files,
      lineReference: lineRef,
    })
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the evidence..."
        rows={2}
        className="text-sm"
      />

      {/* Files */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Attached Files
        </label>
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1 text-xs bg-background px-2 py-1 rounded border"
            >
              <FileText className="size-3" />
              {file.name}
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.pdf"
            className="text-sm h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddFile()
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFile}
            disabled={!newFileName.trim()}
          >
            Add File
          </Button>
        </div>
      </div>

      {/* Line Reference */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Line Reference (optional)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            value={lineRef?.fileName ?? ""}
            onChange={(e) =>
              setLineRef(
                e.target.value
                  ? {
                      ...lineRef,
                      fileName: e.target.value,
                      startLine: lineRef?.startLine ?? 1,
                    }
                  : undefined
              )
            }
            placeholder="filename.pdf"
            className="text-sm h-8"
          />
          <Input
            type="number"
            value={lineRef?.startLine ?? ""}
            onChange={(e) =>
              setLineRef(
                lineRef
                  ? { ...lineRef, startLine: parseInt(e.target.value) || 1 }
                  : { fileName: "", startLine: parseInt(e.target.value) || 1 }
              )
            }
            placeholder="Start line"
            className="text-sm h-8"
          />
          <Input
            type="number"
            value={lineRef?.endLine ?? ""}
            onChange={(e) =>
              setLineRef(
                lineRef
                  ? {
                      ...lineRef,
                      endLine: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }
                  : undefined
              )
            }
            placeholder="End line"
            className="text-sm h-8"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>
          {initialData ? "Update" : "Add Evidence"}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Scores Table
// ============================================================================

function ScoresTable({
  evalData,
  contractors,
  onOpenReview,
}: {
  evalData: TechnicalEvaluationData
  contractors: Array<{ id: string; name: string }>
  onOpenReview: (contractorId?: string, breakdownId?: string) => void
}) {
  const { criteria, scores, status, proposalsUploaded } = evalData

  // Only show contractors that have proposals
  const activeContractors = contractors.filter((c) =>
    proposalsUploaded.includes(c.id)
  )

  // Calculate approval stats
  let totalScores = 0
  let approvedScores = 0
  for (const scope of criteria.scopes) {
    for (const breakdown of scope.breakdowns) {
      for (const contractor of activeContractors) {
        totalScores++
        if (scores[contractor.id]?.[breakdown.id]?.approved) {
          approvedScores++
        }
      }
    }
  }
  const approvalPercent =
    totalScores > 0 ? Math.round((approvedScores / totalScores) * 100) : 0
  const isComplete = status === "review_complete"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-8 bg-background sticky top-0 z-10">
        <h2 className="text-base font-semibold">Technical Summary</h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {approvedScores}/{totalScores} ({approvalPercent}%) scores
              approved
            </p>
          </div>
          <Button
            onClick={() => onOpenReview()}
            variant={isComplete ? "outline" : "default"}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Edit Scores
              </>
            ) : (
              "Review Scores"
            )}
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Criteria</TableHead>
                {activeContractors.map((contractor) => (
                  <TableHead key={contractor.id} className="text-center">
                    {contractor.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteria.scopes.map((scope) => (
                <Fragment key={scope.id}>
                  <TableRow className="bg-muted/50">
                    <TableCell
                      colSpan={activeContractors.length + 1}
                      className="font-medium"
                    >
                      {scope.name}
                    </TableCell>
                  </TableRow>
                  {scope.breakdowns.map((breakdown) => (
                    <TableRow key={breakdown.id}>
                      <TableCell className="pl-6">
                        <div>
                          <p>{breakdown.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {breakdown.weight}%
                          </p>
                        </div>
                      </TableCell>
                      {activeContractors.map((contractor) => {
                        const scoreData = scores[contractor.id]?.[breakdown.id]
                        return (
                          <TableCell
                            key={contractor.id}
                            className="text-center cursor-pointer hover:bg-accent"
                            onClick={() =>
                              onOpenReview(contractor.id, breakdown.id)
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>{scoreData?.score ?? "-"}</span>
                              {scoreData?.approved && (
                                <CheckCircle2 className="size-4 text-green-600" />
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Review Sheet
// ============================================================================

function ReviewSheet({
  open,
  onOpenChange,
  evaluationId,
  evalData,
  contractors,
  initialCell,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluationId: string
  evalData: TechnicalEvaluationData
  contractors: Array<{ id: string; name: string }>
  initialCell: { contractorId: string; breakdownId: string } | null
}) {
  const queryClient = useQueryClient()
  const { criteria, scores, proposalsUploaded } = evalData

  const activeContractors = contractors.filter((c) =>
    proposalsUploaded.includes(c.id)
  )

  // Build flat list of all score cells
  const allCells: Array<{
    scopeName: string
    breakdown: Breakdown
    contractor: { id: string; name: string }
  }> = []
  for (const scope of criteria.scopes) {
    for (const breakdown of scope.breakdowns) {
      for (const contractor of activeContractors) {
        allCells.push({ scopeName: scope.name, breakdown, contractor })
      }
    }
  }

  // Find first unapproved cell
  const findFirstUnapproved = () => {
    const idx = allCells.findIndex(
      (cell) => !scores[cell.contractor.id]?.[cell.breakdown.id]?.approved
    )
    return idx >= 0 ? idx : 0
  }

  // Find cell index by contractor and breakdown
  const findCellIndex = (contractorId: string, breakdownId: string) => {
    const idx = allCells.findIndex(
      (cell) =>
        cell.contractor.id === contractorId && cell.breakdown.id === breakdownId
    )
    return idx >= 0 ? idx : 0
  }

  const [currentIndex, setCurrentIndex] = useState(findFirstUnapproved)
  const [localScore, setLocalScore] = useState<number>(0)
  const [localComment, setLocalComment] = useState<string>("")
  const [localEvidence, setLocalEvidence] = useState<Evidence[]>([])

  // Update currentIndex when sheet opens with initialCell
  useEffect(() => {
    if (open) {
      if (initialCell) {
        setCurrentIndex(
          findCellIndex(initialCell.contractorId, initialCell.breakdownId)
        )
      } else {
        setCurrentIndex(findFirstUnapproved())
      }
    }
  }, [open, initialCell])

  // Update local state when current cell changes
  useEffect(() => {
    if (allCells[currentIndex]) {
      const cell = allCells[currentIndex]
      const scoreData = scores[cell.contractor.id]?.[cell.breakdown.id]
      setLocalScore(scoreData?.score ?? 0)
      setLocalComment(scoreData?.comment ?? "")
      setLocalEvidence(scoreData?.evidence ?? [])
    }
  }, [currentIndex])

  const updateEvaluation = useMutation({
    mutationFn: (newScores: typeof scores) =>
      updateTechnicalEvaluationFn({
        data: {
          evaluationId,
          data: { ...evalData, scores: newScores },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["technical-evaluation", evaluationId, "detail"],
      })
    },
  })

  const currentCell = allCells[currentIndex]
  const totalCells = allCells.length
  const approvedCount = allCells.filter(
    (cell) => scores[cell.contractor.id]?.[cell.breakdown.id]?.approved
  ).length

  const handleApproveAndNext = async () => {
    if (!currentCell) return

    const newScores = { ...scores }
    if (!newScores[currentCell.contractor.id]) {
      newScores[currentCell.contractor.id] = {}
    }
    newScores[currentCell.contractor.id][currentCell.breakdown.id] = {
      score: localScore,
      comment: localComment || undefined,
      approved: true,
      evidence: localEvidence,
    }

    await updateEvaluation.mutateAsync(newScores)

    // Check if all approved
    const allApproved = allCells.every((cell) => {
      if (
        cell.contractor.id === currentCell.contractor.id &&
        cell.breakdown.id === currentCell.breakdown.id
      ) {
        return true // Just approved this one
      }
      return newScores[cell.contractor.id]?.[cell.breakdown.id]?.approved
    })

    if (allApproved) {
      // Mark review complete
      await updateTechnicalEvaluationFn({
        data: {
          evaluationId,
          data: { ...evalData, scores: newScores, status: "review_complete" },
        },
      })
      queryClient.invalidateQueries({
        queryKey: ["technical-evaluation", evaluationId, "detail"],
      })
      toast.success("Review complete!")
      onOpenChange(false)
    } else {
      // Move to next unapproved
      const nextUnapproved = allCells.findIndex(
        (cell, idx) =>
          idx > currentIndex &&
          !newScores[cell.contractor.id]?.[cell.breakdown.id]?.approved
      )
      if (nextUnapproved >= 0) {
        setCurrentIndex(nextUnapproved)
      } else {
        // Wrap around
        const firstUnapproved = allCells.findIndex(
          (cell) =>
            !newScores[cell.contractor.id]?.[cell.breakdown.id]?.approved
        )
        if (firstUnapproved >= 0) {
          setCurrentIndex(firstUnapproved)
        }
      }
    }
  }

  const handleSaveAndNext = async () => {
    if (!currentCell) return

    const newScores = { ...scores }
    if (!newScores[currentCell.contractor.id]) {
      newScores[currentCell.contractor.id] = {}
    }
    newScores[currentCell.contractor.id][currentCell.breakdown.id] = {
      score: localScore,
      comment: localComment || undefined,
      approved:
        scores[currentCell.contractor.id]?.[currentCell.breakdown.id]
          ?.approved ?? false,
      evidence: localEvidence,
    }

    await updateEvaluation.mutateAsync(newScores)

    // Move to next
    if (currentIndex < allCells.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (!currentCell) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[80vw]! max-w-none! sm:max-w-none!"
        showCloseButton
      >
        <SheetHeader>
          <SheetTitle>Review Scores</SheetTitle>
          <SheetDescription>
            {approvedCount}/{totalCells} scores approved
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          {/* Left panel - mini table */}
          <div className="w-2/5 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Criteria</TableHead>
                  {activeContractors.map((c) => (
                    <TableHead key={c.id} className="text-center text-xs">
                      {c.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.scopes.map((scope) => (
                  <Fragment key={scope.id}>
                    <TableRow className="bg-muted/50">
                      <TableCell
                        colSpan={activeContractors.length + 1}
                        className="text-xs font-medium py-1"
                      >
                        {scope.name}
                      </TableCell>
                    </TableRow>
                    {scope.breakdowns.map((breakdown) => (
                      <TableRow key={breakdown.id}>
                        <TableCell className="text-xs py-1 pl-4">
                          {breakdown.title}
                        </TableCell>
                        {activeContractors.map((contractor) => {
                          const isSelected =
                            currentCell.breakdown.id === breakdown.id &&
                            currentCell.contractor.id === contractor.id
                          const scoreData =
                            scores[contractor.id]?.[breakdown.id]
                          const cellIndex = allCells.findIndex(
                            (c) =>
                              c.breakdown.id === breakdown.id &&
                              c.contractor.id === contractor.id
                          )
                          return (
                            <TableCell
                              key={contractor.id}
                              className={cn(
                                "text-center text-xs py-1 cursor-pointer hover:bg-accent",
                                isSelected && "bg-primary/20 font-medium"
                              )}
                              onClick={() => setCurrentIndex(cellIndex)}
                            >
                              <div className="flex items-center justify-center gap-0.5">
                                <span>{scoreData?.score ?? "-"}</span>
                                {scoreData?.approved ? (
                                  <CheckCircle2 className="size-3 text-green-600" />
                                ) : (
                                  <Circle className="size-3 text-muted-foreground/30" />
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Right panel - edit form */}
          <div className="w-3/5 flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground">
                  {currentCell.scopeName}
                </p>
                <h3 className="text-lg font-semibold">
                  {currentCell.breakdown.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentCell.breakdown.description}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Contractor</p>
                <p className="text-lg">{currentCell.contractor.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Score (0-100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={localScore}
                  onChange={(e) => setLocalScore(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Comment (optional)
                </label>
                <Textarea
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                  placeholder="Add notes about this score..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Evidence Section */}
              <EvidenceSection
                evidence={localEvidence}
                onChange={setLocalEvidence}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Score {currentIndex + 1} of {totalCells}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveAndNext}
                  disabled={updateEvaluation.isPending}
                >
                  Save and Next
                </Button>
                <Button
                  onClick={handleApproveAndNext}
                  disabled={updateEvaluation.isPending}
                >
                  <Check className="size-4 mr-1" />
                  Approve and Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
