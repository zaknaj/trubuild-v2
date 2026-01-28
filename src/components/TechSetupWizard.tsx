import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTechnicalEvaluationFn, updateTechnicalEvaluationFn } from "@/fn"
import { generateMockPTCs } from "@/lib/mock-ptc-data"
import { queryKeys } from "@/lib/query-options"
import useStore from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Upload, Check, Trash2, CheckCircle2, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Types - exported for use in main tech evaluation file
export interface Breakdown {
  id: string
  title: string
  description: string
  weight: number
}

export interface Scope {
  id: string
  name: string
  breakdowns: Breakdown[]
}

export interface EvidenceFile {
  id: string
  name: string
  fakeUrl: string // Simulated upload URL
}

export interface LineReference {
  fileName: string
  startLine: number
  endLine?: number // Optional - if undefined, single line
}

export interface Evidence {
  id: string
  text: string
  source: "auto" | "manual"
  files: EvidenceFile[]
  lineReference?: LineReference
}

export interface ScoreData {
  score: number
  comment?: string
  approved: boolean
  evidence: Evidence[]
}

export interface TechnicalEvaluationData {
  status: "setup" | "analyzing" | "ready" | "review_complete"
  setupStep: 1 | 2 | 3
  documentsUploaded: boolean
  criteria: {
    scopes: Scope[]
  }
  proposalsUploaded: string[]
  scores: Record<string, Record<string, ScoreData>>
}

// Generate fresh default criteria with new UUIDs
function generateDefaultCriteria(): Scope[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Technical Capability",
      breakdowns: [
        {
          id: crypto.randomUUID(),
          title: "Experience & Track Record",
          description: "Past project experience relevant to this scope",
          weight: 15,
        },
        {
          id: crypto.randomUUID(),
          title: "Technical Approach",
          description: "Methodology and technical solution proposed",
          weight: 20,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Resources & Team",
      breakdowns: [
        {
          id: crypto.randomUUID(),
          title: "Key Personnel",
          description: "Qualifications of proposed team members",
          weight: 15,
        },
        {
          id: crypto.randomUUID(),
          title: "Equipment & Resources",
          description: "Available equipment and resource capacity",
          weight: 10,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Project Management",
      breakdowns: [
        {
          id: crypto.randomUUID(),
          title: "Schedule & Planning",
          description: "Proposed timeline and project plan",
          weight: 20,
        },
        {
          id: crypto.randomUUID(),
          title: "Risk Management",
          description: "Risk identification and mitigation strategies",
          weight: 10,
        },
        {
          id: crypto.randomUUID(),
          title: "Quality Assurance",
          description: "QA/QC procedures and standards",
          weight: 10,
        },
      ],
    },
  ]
}

// Sample evidence texts for mock data generation
const SAMPLE_EVIDENCE_TEXTS = [
  "Contractor demonstrates 10+ years of experience in similar projects",
  "Technical methodology aligns with industry best practices",
  "Team composition includes certified professionals",
  "Risk mitigation strategy addresses key project concerns",
  "Proposed timeline is realistic and achievable",
  "Quality assurance procedures meet ISO standards",
  "Equipment list shows adequate capacity for project scope",
  "Previous project references confirm successful delivery",
  "Resource allocation plan is comprehensive",
  "Safety protocols exceed minimum requirements",
]

const SAMPLE_FILE_NAMES = [
  "technical_proposal.pdf",
  "company_profile.pdf",
  "project_methodology.pdf",
  "team_cvs.pdf",
  "equipment_list.xlsx",
  "reference_letters.pdf",
  "certifications.pdf",
  "safety_plan.pdf",
]

function generateFakeEvidence(): Evidence[] {
  const evidenceCount = Math.floor(Math.random() * 3) + 2 // 2-4 items
  const evidence: Evidence[] = []

  for (let i = 0; i < evidenceCount; i++) {
    const textIndex = Math.floor(Math.random() * SAMPLE_EVIDENCE_TEXTS.length)
    const hasFiles = Math.random() > 0.3 // 70% chance of having files
    const hasLineRef = Math.random() > 0.4 // 60% chance of having line reference

    const files: EvidenceFile[] = []
    if (hasFiles) {
      const fileCount = Math.floor(Math.random() * 2) + 1 // 1-2 files
      for (let j = 0; j < fileCount; j++) {
        const fileIndex = Math.floor(Math.random() * SAMPLE_FILE_NAMES.length)
        files.push({
          id: crypto.randomUUID(),
          name: SAMPLE_FILE_NAMES[fileIndex],
          fakeUrl: `/uploads/${SAMPLE_FILE_NAMES[fileIndex]}`,
        })
      }
    }

    const lineReference: LineReference | undefined = hasLineRef
      ? {
          fileName: files.length > 0 ? files[0].name : "technical_proposal.pdf",
          startLine: Math.floor(Math.random() * 100) + 1,
          endLine:
            Math.random() > 0.5
              ? Math.floor(Math.random() * 20) +
                Math.floor(Math.random() * 100) +
                1
              : undefined,
        }
      : undefined

    evidence.push({
      id: crypto.randomUUID(),
      text: SAMPLE_EVIDENCE_TEXTS[textIndex],
      source: "auto",
      files,
      lineReference,
    })
  }

  return evidence
}

function generateFakeScores(
  criteria: Scope[],
  contractorIds: string[]
): Record<string, Record<string, ScoreData>> {
  const scores: Record<string, Record<string, ScoreData>> = {}
  for (const contractorId of contractorIds) {
    scores[contractorId] = {}
    for (const scope of criteria) {
      for (const breakdown of scope.breakdowns) {
        scores[contractorId][breakdown.id] = {
          score: Math.floor(Math.random() * 30) + 60, // 60-90 range
          approved: false,
          evidence: generateFakeEvidence(),
        }
      }
    }
  }
  return scores
}

// ============================================================================
// Setup Wizard
// ============================================================================

export function TechSetupWizard({
  open,
  onOpenChange,
  packageId,
  contractors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageId: string
  contractors: Array<{ id: string; name: string }>
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setTechRound = useStore((s) => s.setTechRound)

  const [step, setStep] = useState(1)
  const [documentsUploaded, setDocumentsUploaded] = useState(false)
  const [criteria, setCriteria] = useState<Scope[]>(() =>
    generateDefaultCriteria()
  )
  const [proposalsUploaded, setProposalsUploaded] = useState<string[]>([])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setDocumentsUploaded(false)
      setCriteria(generateDefaultCriteria())
      setProposalsUploaded([])
    }
  }, [open])

  const createEvaluation = useMutation({
    mutationFn: async (evalData: TechnicalEvaluationData) => {
      // Create the evaluation with all data
      const result = await createTechnicalEvaluationFn({
        data: { packageId, data: evalData },
      })
      return result as { id: string; roundName: string }
    },
    onSuccess: async (newEval) => {
      toast.success(`${newEval.roundName} created`)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.package.technicalEvaluations(packageId),
      })
      setTechRound(packageId, newEval.id)
      // Navigate to the summary page
      navigate({ to: "/package/$id/tech", params: { id: packageId } })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create round"
      )
    },
  })

  const totalWeight = criteria.reduce(
    (sum, scope) =>
      sum + scope.breakdowns.reduce((s, b) => s + (b.weight || 0), 0),
    0
  )

  const canProceedStep2 = totalWeight === 100
  const canStartAnalysis = proposalsUploaded.length > 0

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleStartAnalysis = async () => {
    // Generate fake scores
    const fakeScores = generateFakeScores(criteria, proposalsUploaded)

    // Generate PTCs for contractors with uploaded proposals
    const contractorsWithProposals = contractors.filter((c) =>
      proposalsUploaded.includes(c.id)
    )
    const ptcs = generateMockPTCs(contractorsWithProposals)

    // Create the evaluation with "analyzing" status
    const evaluationData: TechnicalEvaluationData = {
      status: "analyzing",
      setupStep: 3,
      documentsUploaded: true,
      criteria: { scopes: criteria },
      proposalsUploaded,
      scores: fakeScores,
      ptcs,
    } as TechnicalEvaluationData

    const newEval = await createEvaluation.mutateAsync(evaluationData)
    onOpenChange(false)

    // Simulate analysis delay then set to ready
    setTimeout(async () => {
      await updateTechnicalEvaluationFn({
        data: {
          evaluationId: newEval.id,
          data: { ...evaluationData, status: "ready" },
        },
      })
      queryClient.invalidateQueries({
        queryKey: ["technical-evaluation", newEval.id, "detail"],
      })
    }, 2000)
  }

  const toggleProposal = (contractorId: string) => {
    setProposalsUploaded((prev) =>
      prev.includes(contractorId)
        ? prev.filter((id) => id !== contractorId)
        : [...prev, contractorId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {step !== 2 && (
          <DialogHeader>
            <DialogTitle>
              {step === 1 && "Step 1: Upload Documents"}
              {step === 3 && "Step 3: Upload Contractor Proposals"}
            </DialogTitle>
            <DialogDescription>
              {step === 1 &&
                "Upload the RFP and evaluation criteria documents to extract evaluation parameters."}
              {step === 3 &&
                "Mark which contractors have submitted their proposals for evaluation."}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 && (
            <Step1Upload
              uploaded={documentsUploaded}
              onUpload={() => setDocumentsUploaded(true)}
            />
          )}
          {step === 2 && (
            <Step2Criteria
              criteria={criteria}
              onChange={setCriteria}
              totalWeight={totalWeight}
            />
          )}
          {step === 3 && (
            <Step3Proposals
              contractors={contractors}
              uploaded={proposalsUploaded}
              onToggle={toggleProposal}
            />
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 1 && (
            <Button onClick={handleNext} disabled={!documentsUploaded}>
              Next
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleNext} disabled={!canProceedStep2}>
              {totalWeight !== 100
                ? `Weights: ${totalWeight}% (need 100%)`
                : "Next"}
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleStartAnalysis}
              disabled={!canStartAnalysis || createEvaluation.isPending}
            >
              {createEvaluation.isPending ? "Starting..." : "Start Analysis"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Step1Upload({
  uploaded,
  onUpload,
}: {
  uploaded: boolean
  onUpload: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        {uploaded ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="size-12 text-green-600" />
            <p className="font-medium">Documents uploaded</p>
            <p className="text-sm text-muted-foreground">
              RFP and evaluation criteria ready for processing
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="size-12 text-muted-foreground" />
            <p className="font-medium">Upload RFP & Evaluation Criteria</p>
            <p className="text-sm text-muted-foreground">
              PDF, DOC, or DOCX files
            </p>
            <Button className="mt-4" onClick={onUpload}>
              Mark as Uploaded
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline editable text input that looks like plain text
function InlineInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "bg-transparent border border-transparent rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 outline-none transition-colors",
        "hover:border-border/50",
        "focus:border-ring focus:ring-2 focus:ring-ring/20",
        "placeholder:text-muted-foreground/50",
        inputClassName,
        className
      )}
    />
  )
}

// Weight input styled as a pill
function WeightInput({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="inline-flex items-center bg-muted/50 rounded-lg px-3 py-1.5 h-9 min-w-18 justify-center transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="bg-transparent w-8 text-center outline-none text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-sm text-muted-foreground">%</span>
    </div>
  )
}

// Display-only weight total styled to match WeightInput
function WeightTotal({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center bg-transparent rounded-lg px-3 py-1.5 h-9 min-w-18 justify-center">
      <span className="text-sm font-medium text-muted-foreground">
        {value}%
      </span>
    </div>
  )
}

function Step2Criteria({
  criteria,
  onChange,
  totalWeight,
}: {
  criteria: Scope[]
  onChange: (criteria: Scope[]) => void
  totalWeight: number
}) {
  const addScope = () => {
    onChange([
      ...criteria,
      {
        id: crypto.randomUUID(),
        name: "New Scope",
        breakdowns: [],
      },
    ])
  }

  const updateScope = (scopeId: string, updates: Partial<Scope>) => {
    onChange(criteria.map((s) => (s.id === scopeId ? { ...s, ...updates } : s)))
  }

  const removeScope = (scopeId: string) => {
    onChange(criteria.filter((s) => s.id !== scopeId))
  }

  const addBreakdown = (scopeId: string) => {
    onChange(
      criteria.map((s) =>
        s.id === scopeId
          ? {
              ...s,
              breakdowns: [
                ...s.breakdowns,
                {
                  id: crypto.randomUUID(),
                  title: "New Criteria",
                  description: "",
                  weight: 0,
                },
              ],
            }
          : s
      )
    )
  }

  const updateBreakdown = (
    scopeId: string,
    breakdownId: string,
    updates: Partial<Breakdown>
  ) => {
    onChange(
      criteria.map((s) =>
        s.id === scopeId
          ? {
              ...s,
              breakdowns: s.breakdowns.map((b) =>
                b.id === breakdownId ? { ...b, ...updates } : b
              ),
            }
          : s
      )
    )
  }

  const removeBreakdown = (scopeId: string, breakdownId: string) => {
    onChange(
      criteria.map((s) =>
        s.id === scopeId
          ? {
              ...s,
              breakdowns: s.breakdowns.filter((b) => b.id !== breakdownId),
            }
          : s
      )
    )
  }

  return (
    <div className="space-y-8 px-4">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Evaluation Criteria</h3>
          <button className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
            Revert all changes
          </button>
        </div>
        <span
          className={cn(
            "text-2xl font-semibold",
            totalWeight === 100 ? "text-foreground" : "text-amber-600"
          )}
        >
          {totalWeight}%
        </span>
      </div>

      {/* Scopes */}
      <div className="space-y-8">
        {criteria.map((scope) => {
          const scopeWeight = scope.breakdowns.reduce(
            (sum, b) => sum + (b.weight || 0),
            0
          )
          return (
            <div key={scope.id} className="space-y-1">
              {/* Scope header */}
              <div className="group flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <InlineInput
                    value={scope.name}
                    onChange={(value) => updateScope(scope.id, { name: value })}
                    className="font-semibold text-base flex-1"
                    inputClassName="w-full"
                  />
                  <button
                    onClick={() => removeScope(scope.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded shrink-0"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <WeightTotal value={scopeWeight} />
              </div>

              {/* Breakdowns with tree structure */}
              <div className="relative ml-2">
                {scope.breakdowns.map((breakdown, idx) => {
                  const isLast = idx === scope.breakdowns.length - 1
                  return (
                    <div
                      key={breakdown.id}
                      className="group relative flex items-start gap-4 py-3"
                    >
                      {/* Vertical line - extends down unless this is the last item */}
                      {!isLast && (
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                      )}
                      {/* Vertical line segment for the last item - only goes to the connector */}
                      {isLast && (
                        <div className="absolute left-0 top-0 h-6 w-px bg-border" />
                      )}

                      {/* Horizontal connector */}
                      <div className="absolute left-0 top-6 w-4 h-px bg-border" />

                      {/* Content */}
                      <div className="flex-1 ml-6 space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <InlineInput
                            value={breakdown.title}
                            onChange={(value) =>
                              updateBreakdown(scope.id, breakdown.id, {
                                title: value,
                              })
                            }
                            placeholder="Title"
                            className="font-medium flex-1"
                            inputClassName="w-full"
                          />
                          <button
                            onClick={() =>
                              removeBreakdown(scope.id, breakdown.id)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded shrink-0"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <InlineInput
                          value={breakdown.description}
                          onChange={(value) =>
                            updateBreakdown(scope.id, breakdown.id, {
                              description: value,
                            })
                          }
                          placeholder="Add description..."
                          className="text-sm text-muted-foreground w-full"
                        />
                      </div>

                      {/* Weight pill */}
                      <WeightInput
                        value={breakdown.weight}
                        onChange={(value) =>
                          updateBreakdown(scope.id, breakdown.id, {
                            weight: value,
                          })
                        }
                      />
                    </div>
                  )
                })}

                {/* Add breakdown button - no tree line */}
                <div className="flex items-center py-2">
                  <button
                    onClick={() => addBreakdown(scope.id)}
                    className="ml-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add breakdown
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add scope button */}
      <button
        onClick={addScope}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add a scope
      </button>
    </div>
  )
}

function Step3Proposals({
  contractors,
  uploaded,
  onToggle,
}: {
  contractors: Array<{ id: string; name: string }>
  uploaded: string[]
  onToggle: (id: string) => void
}) {
  if (contractors.length === 0) {
    return (
      <div className="text-center py-8">
        <UserIcon className="size-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          No contractors added to this package yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contractors.map((contractor) => {
        const isUploaded = uploaded.includes(contractor.id)
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
                {isUploaded ? "Proposal uploaded" : "No proposal uploaded"}
              </p>
            </div>
            <Button
              variant={isUploaded ? "outline" : "default"}
              size="sm"
              onClick={() => onToggle(contractor.id)}
            >
              {isUploaded ? (
                <>
                  <Check className="size-4 mr-1" />
                  Uploaded
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1" />
                  Mark Uploaded
                </>
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
