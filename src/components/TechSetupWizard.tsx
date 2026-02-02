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
import { UploadZone, type UploadedFile } from "@/components/ui/upload-zone"
import { StepTitle } from "@/components/ui/step-title"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Trash2, UserIcon, Sparkles, Download, Loader2 } from "lucide-react"
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

  // Step state
  const [step, setStep] = useState(1)
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)

  // Step 1 state
  const [rfpFile, setRfpFile] = useState<UploadedFile[]>([])
  const [criteriaMode, setCriteriaMode] = useState<"upload" | "ai" | null>(null)
  const [criteriaFile, setCriteriaFile] = useState<UploadedFile[]>([])
  const [vendorFiles, setVendorFiles] = useState<
    Record<string, UploadedFile[]>
  >({})

  // Step 2 state (criteria editing)
  const [criteria, setCriteria] = useState<Scope[]>(() =>
    generateDefaultCriteria()
  )

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setIsExtracting(false)
      setUploadingCount(0)
      setRfpFile([])
      setCriteriaMode(null)
      setCriteriaFile([])
      setVendorFiles({})
      setCriteria(generateDefaultCriteria())
    }
  }, [open])

  const createEvaluation = useMutation({
    mutationFn: async (evalData: TechnicalEvaluationData) => {
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
      navigate({ to: "/package/$id/tech", params: { id: packageId } })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create round"
      )
    },
  })

  // Step 1 validation
  const isRfpDone = rfpFile.length > 0
  const isCriteriaDone =
    criteriaMode === "ai" ||
    (criteriaMode === "upload" && criteriaFile.length > 0)
  const vendorsWithFiles = Object.entries(vendorFiles).filter(
    ([, files]) => files.length > 0
  ).length
  const isVendorsDone = vendorsWithFiles >= 2
  const isUploading = uploadingCount > 0

  const canProceedStep1 =
    isRfpDone && isCriteriaDone && isVendorsDone && !isUploading

  // Step 2 validation
  const totalWeight = criteria.reduce(
    (sum, scope) =>
      sum + scope.breakdowns.reduce((s, b) => s + (b.weight || 0), 0),
    0
  )
  const canProceedStep2 = totalWeight === 100

  // Get contractor IDs with files
  const proposalsUploaded = Object.entries(vendorFiles)
    .filter(([, files]) => files.length > 0)
    .map(([id]) => id)

  const handleNext = () => {
    if (step === 1) {
      // Show extracting state, then move to step 2
      setIsExtracting(true)
      setTimeout(() => {
        setIsExtracting(false)
        setStep(2)
      }, 1500)
    }
  }

  const handleStartAnalysis = async () => {
    const fakeScores = generateFakeScores(criteria, proposalsUploaded)
    const contractorsWithProposals = contractors.filter((c) =>
      proposalsUploaded.includes(c.id)
    )
    const ptcs = generateMockPTCs(contractorsWithProposals)

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

  const handleVendorFilesChange = (vendorId: string, files: UploadedFile[]) => {
    setVendorFiles((prev) => ({ ...prev, [vendorId]: files }))
  }

  const handleUploadingChange = (isUploading: boolean) => {
    setUploadingCount((prev) => prev + (isUploading ? 1 : -1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {isExtracting ? (
          // Extracting state
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="size-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-lg">
                Extracting Evaluation Criteria
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzing your documents...
              </p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === 1 && "Step 1: Upload Documents"}
                {step === 2 && "Step 2: Review Evaluation Criteria"}
              </DialogTitle>
              <DialogDescription>
                {step === 1 &&
                  "Upload the required documents and vendor proposals for technical evaluation."}
                {step === 2 &&
                  "Review and adjust the evaluation criteria extracted from your documents."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4">
              {step === 1 && (
                <Step1Documents
                  packageId={packageId}
                  contractors={contractors}
                  rfpFile={rfpFile}
                  onRfpFileChange={setRfpFile}
                  criteriaMode={criteriaMode}
                  onCriteriaModeChange={setCriteriaMode}
                  criteriaFile={criteriaFile}
                  onCriteriaFileChange={setCriteriaFile}
                  vendorFiles={vendorFiles}
                  onVendorFilesChange={handleVendorFilesChange}
                  vendorsWithFiles={vendorsWithFiles}
                  onUploadingChange={handleUploadingChange}
                />
              )}
              {step === 2 && (
                <Step2Criteria
                  criteria={criteria}
                  onChange={setCriteria}
                  totalWeight={totalWeight}
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
                <Button
                  onClick={handleNext}
                  disabled={!canProceedStep1 || isExtracting}
                >
                  {isUploading ? "Uploading..." : "Next"}
                </Button>
              )}
              {step === 2 && (
                <Button
                  onClick={handleStartAnalysis}
                  disabled={!canProceedStep2 || createEvaluation.isPending}
                >
                  {createEvaluation.isPending
                    ? "Starting..."
                    : totalWeight !== 100
                      ? `Weights: ${totalWeight}% (need 100%)`
                      : "Start Analysis"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Step 1: Document Upload
// ============================================================================

function Step1Documents({
  packageId,
  contractors,
  rfpFile,
  onRfpFileChange,
  criteriaMode,
  onCriteriaModeChange,
  criteriaFile,
  onCriteriaFileChange,
  vendorFiles,
  onVendorFilesChange,
  vendorsWithFiles,
  onUploadingChange,
}: {
  packageId: string
  contractors: Array<{ id: string; name: string }>
  rfpFile: UploadedFile[]
  onRfpFileChange: (files: UploadedFile[]) => void
  criteriaMode: "upload" | "ai" | null
  onCriteriaModeChange: (mode: "upload" | "ai") => void
  criteriaFile: UploadedFile[]
  onCriteriaFileChange: (files: UploadedFile[]) => void
  vendorFiles: Record<string, UploadedFile[]>
  onVendorFilesChange: (vendorId: string, files: UploadedFile[]) => void
  vendorsWithFiles: number
  onUploadingChange: (isUploading: boolean) => void
}) {
  const isRfpDone = rfpFile.length > 0
  const isCriteriaDone =
    criteriaMode === "ai" ||
    (criteriaMode === "upload" && criteriaFile.length > 0)

  return (
    <div className="space-y-8 px-1">
      {/* Section 1: RFP */}
      <div className="space-y-3">
        <StepTitle
          title="Request For Proposals (RFP)"
          complete={isRfpDone}
          required
        />
        <UploadZone
          files={rfpFile}
          onFilesChange={onRfpFileChange}
          packageId={packageId}
          category="rfp"
          onUploadingChange={onUploadingChange}
          accept=".pdf,.doc,.docx"
        />
      </div>

      {/* Section 2: Evaluation Criteria */}
      <div className="space-y-3">
        <StepTitle
          title="Evaluation Criteria"
          complete={isCriteriaDone}
          required
        />

        <RadioGroup
          value={criteriaMode ?? ""}
          onValueChange={(v) => onCriteriaModeChange(v as "upload" | "ai")}
          className="space-y-3"
        >
          {/* Upload option */}
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer",
              criteriaMode === "upload"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            )}
            onClick={() => onCriteriaModeChange("upload")}
          >
            <RadioGroupItem
              value="upload"
              id="criteria-upload"
              className="mt-1"
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="criteria-upload"
                  className="cursor-pointer font-medium"
                >
                  Upload your own
                </Label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toast.success("Template download started")
                  }}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="size-3.5" />
                  Download template
                </a>
              </div>
              {criteriaMode === "upload" && (
                <UploadZone
                  files={criteriaFile}
                  onFilesChange={onCriteriaFileChange}
                  packageId={packageId}
                  category="criteria"
                  onUploadingChange={onUploadingChange}
                  accept=".pdf,.doc,.docx,.xlsx"
                  compact
                />
              )}
            </div>
          </div>

          {/* AI option */}
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer",
              criteriaMode === "ai"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            )}
            onClick={() => onCriteriaModeChange("ai")}
          >
            <RadioGroupItem value="ai" id="criteria-ai" className="mt-1" />
            <div className="flex-1">
              <Label
                htmlFor="criteria-ai"
                className="cursor-pointer font-medium flex items-center gap-2"
              >
                <Sparkles className="size-4 text-amber-500" />
                Generate with AI
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                We'll analyze your RFP and generate evaluation criteria
                automatically
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Section 3: Vendor Proposals */}
      <div className="space-y-3">
        <StepTitle
          title={`Vendor Proposals (${vendorsWithFiles}/${contractors.length} vendors have files)`}
          complete={vendorsWithFiles >= 2}
          required
        />

        {contractors.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <UserIcon className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No contractors added to this package yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contractors.map((contractor) => {
              const files = vendorFiles[contractor.id] ?? []
              const hasFiles = files.length > 0

              return (
                <div
                  key={contractor.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    hasFiles &&
                      "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <UserIcon size={16} className="text-muted-foreground" />
                    </div>
                    <span className="font-medium">{contractor.name}</span>
                  </div>
                  <UploadZone
                    files={files}
                    onFilesChange={(newFiles) =>
                      onVendorFilesChange(contractor.id, newFiles)
                    }
                    packageId={packageId}
                    category="vendor_proposal"
                    contractorId={contractor.id}
                    onUploadingChange={onUploadingChange}
                    multiple
                    accept=".pdf,.doc,.docx,.xlsx"
                    compact
                  />
                </div>
              )
            })}

            {vendorsWithFiles < 2 && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                At least 2 vendors must have files to proceed
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Step 2: Criteria Review
// ============================================================================

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
