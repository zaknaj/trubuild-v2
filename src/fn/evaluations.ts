import { db } from "@/db"
import {
  technicalEvaluation,
  commercialEvaluation,
  packageContractor,
} from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  getAuthContext,
  requirePackageTechnicalAccess,
  requirePackageCommercialAccess,
} from "../auth/auth-guards"
import { ERRORS } from "@/lib/errors"
import { generateMockBOQData } from "@/lib/mock-boq-data"
import { generateMockPTCs } from "@/lib/mock-ptc-data"
import type { ContractorPTCs } from "@/lib/types"

// ============================================================================
// Technical Evaluations
// ============================================================================

export const createTechnicalEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.uuid(),
      data: z.any().optional().default({}),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageTechnicalAccess(ctx, data.packageId)

    // Get the next round number
    const existing = await db
      .select({ roundNumber: technicalEvaluation.roundNumber })
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.packageId, data.packageId))
      .orderBy(desc(technicalEvaluation.roundNumber))
      .limit(1)

    const nextRoundNumber = existing.length > 0 ? existing[0].roundNumber + 1 : 1

    const [newEval] = await db
      .insert(technicalEvaluation)
      .values({
        packageId: data.packageId,
        roundNumber: nextRoundNumber,
        roundName: `Round ${nextRoundNumber}`,
        data: data.data,
      })
      .returning()

    return newEval
  })

export const listTechnicalEvaluationsFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageTechnicalAccess(ctx, data.packageId)

    const evaluations = await db
      .select()
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.packageId, data.packageId))
      .orderBy(desc(technicalEvaluation.roundNumber))

    return evaluations
  })

export const getTechnicalEvaluationFn = createServerFn()
  .inputValidator(z.object({ evaluationId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    const [evaluation] = await db
      .select()
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .limit(1)

    if (!evaluation) throw new Error(ERRORS.NOT_FOUND("Technical Evaluation"))
    await requirePackageTechnicalAccess(ctx, evaluation.packageId)

    return evaluation
  })

export const updateTechnicalEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      evaluationId: z.uuid(),
      data: z.any(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get existing to check access
    const [existing] = await db
      .select()
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .limit(1)

    if (!existing) throw new Error(ERRORS.NOT_FOUND("Technical Evaluation"))
    await requirePackageTechnicalAccess(ctx, existing.packageId)

    const [updated] = await db
      .update(technicalEvaluation)
      .set({
        data: data.data,
        updatedAt: new Date(),
      })
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .returning()

    return updated
  })

export const runTechnicalEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      evaluationId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get the evaluation
    const [evaluation] = await db
      .select()
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .limit(1)

    if (!evaluation) throw new Error(ERRORS.NOT_FOUND("Technical Evaluation"))
    await requirePackageTechnicalAccess(ctx, evaluation.packageId)

    // Fetch the package's contractors
    const contractors = await db
      .select()
      .from(packageContractor)
      .where(eq(packageContractor.packageId, evaluation.packageId))

    if (contractors.length === 0) {
      throw new Error("No contractors found for this package")
    }

    // Generate mock PTCs
    const contractorList = contractors.map((c) => ({ id: c.id, name: c.name }))
    const mockPTCs = generateMockPTCs(contractorList)

    // Preserve existing data and add PTCs
    const existingData = (evaluation.data as Record<string, unknown>) || {}
    const updatedData = {
      ...existingData,
      ptcs: mockPTCs,
    }

    // Update evaluation with data
    const [updated] = await db
      .update(technicalEvaluation)
      .set({
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .returning()

    return updated
  })

export const updateTechnicalEvaluationPTCsFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      evaluationId: z.uuid(),
      ptcs: z.any(), // ContractorPTCs[]
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get the evaluation
    const [evaluation] = await db
      .select()
      .from(technicalEvaluation)
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .limit(1)

    if (!evaluation) throw new Error(ERRORS.NOT_FOUND("Technical Evaluation"))
    await requirePackageTechnicalAccess(ctx, evaluation.packageId)

    // Update only the PTCs in the evaluation data
    const existingData = (evaluation.data as Record<string, unknown>) || {}
    const updatedData = {
      ...existingData,
      ptcs: data.ptcs as ContractorPTCs[],
    }

    const [updated] = await db
      .update(technicalEvaluation)
      .set({
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(technicalEvaluation.id, data.evaluationId))
      .returning()

    return updated
  })

// ============================================================================
// Commercial Evaluations
// ============================================================================

export const createCommercialEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      assetId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get package from asset to check access
    const [assetRecord] = await db.query.asset.findMany({
      where: (asset, { eq }) => eq(asset.id, data.assetId),
      limit: 1,
    })

    if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
    await requirePackageCommercialAccess(ctx, assetRecord.packageId)

    // Get the next round number
    const existing = await db
      .select({ roundNumber: commercialEvaluation.roundNumber })
      .from(commercialEvaluation)
      .where(eq(commercialEvaluation.assetId, data.assetId))
      .orderBy(desc(commercialEvaluation.roundNumber))
      .limit(1)

    const nextRoundNumber = existing.length > 0 ? existing[0].roundNumber + 1 : 1

    // Create evaluation without data (setup not started)
    const [newEval] = await db
      .insert(commercialEvaluation)
      .values({
        assetId: data.assetId,
        roundNumber: nextRoundNumber,
        roundName: `Round ${nextRoundNumber}`,
        data: {},
      })
      .returning()

    return newEval
  })

export const runCommercialEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      evaluationId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get the evaluation
    const [evaluation] = await db
      .select()
      .from(commercialEvaluation)
      .where(eq(commercialEvaluation.id, data.evaluationId))
      .limit(1)

    if (!evaluation) throw new Error(ERRORS.NOT_FOUND("Commercial Evaluation"))

    // Get package from asset to check access
    const [assetRecord] = await db.query.asset.findMany({
      where: (asset, { eq }) => eq(asset.id, evaluation.assetId),
      limit: 1,
    })

    if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
    await requirePackageCommercialAccess(ctx, assetRecord.packageId)

    // Fetch the package's contractors
    const contractors = await db
      .select()
      .from(packageContractor)
      .where(eq(packageContractor.packageId, assetRecord.packageId))

    if (contractors.length === 0) {
      throw new Error("No contractors found for this package")
    }

    // Generate mock BOQ data
    const contractorList = contractors.map((c) => ({ id: c.id, name: c.name }))
    const mockBOQData = generateMockBOQData(contractorList)

    // Generate mock PTCs
    const mockPTCs = generateMockPTCs(contractorList)

    // Update evaluation with data
    const [updated] = await db
      .update(commercialEvaluation)
      .set({
        data: { ...mockBOQData, ptcs: mockPTCs },
        updatedAt: new Date(),
      })
      .where(eq(commercialEvaluation.id, data.evaluationId))
      .returning()

    return updated
  })

export const updateCommercialEvaluationPTCsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      evaluationId: z.uuid(),
      ptcs: z.any(), // ContractorPTCs[]
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get the evaluation
    const [evaluation] = await db
      .select()
      .from(commercialEvaluation)
      .where(eq(commercialEvaluation.id, data.evaluationId))
      .limit(1)

    if (!evaluation) throw new Error(ERRORS.NOT_FOUND("Commercial Evaluation"))

    // Get package from asset to check access
    const [assetRecord] = await db.query.asset.findMany({
      where: (asset, { eq }) => eq(asset.id, evaluation.assetId),
      limit: 1,
    })

    if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
    await requirePackageCommercialAccess(ctx, assetRecord.packageId)

    // Update only the PTCs in the evaluation data
    const existingData = (evaluation.data as Record<string, unknown>) || {}
    const updatedData = {
      ...existingData,
      ptcs: data.ptcs as ContractorPTCs[],
    }

    const [updated] = await db
      .update(commercialEvaluation)
      .set({
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(commercialEvaluation.id, data.evaluationId))
      .returning()

    return updated
  })

export const listCommercialEvaluationsFn = createServerFn()
  .inputValidator(z.object({ assetId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get package from asset to check access
    const [assetRecord] = await db.query.asset.findMany({
      where: (asset, { eq }) => eq(asset.id, data.assetId),
      limit: 1,
    })

    if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
    await requirePackageCommercialAccess(ctx, assetRecord.packageId)

    const evaluations = await db
      .select()
      .from(commercialEvaluation)
      .where(eq(commercialEvaluation.assetId, data.assetId))
      .orderBy(desc(commercialEvaluation.roundNumber))

    return evaluations
  })

export const hasAnyCommercialEvaluationFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageCommercialAccess(ctx, data.packageId)

    // Check if any asset in this package has a commercial evaluation
    const result = await db.query.pkg.findFirst({
      where: (pkg, { eq }) => eq(pkg.id, data.packageId),
      with: {
        assets: {
          with: {
            commercialEvaluations: {
              limit: 1,
            },
          },
        },
      },
    })

    if (!result) return { hasEvaluation: false }

    const hasEvaluation = result.assets.some(
      (asset) => asset.commercialEvaluations.length > 0
    )

    return { hasEvaluation }
  })

export const getPackageCommercialSummaryFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageCommercialAccess(ctx, data.packageId)

    // Get all assets with their latest commercial evaluation
    const result = await db.query.pkg.findFirst({
      where: (pkg, { eq }) => eq(pkg.id, data.packageId),
      with: {
        assets: {
          with: {
            commercialEvaluations: {
              orderBy: (ce, { desc }) => [desc(ce.roundNumber)],
              limit: 1,
            },
          },
        },
      },
    })

    if (!result) return { assets: [] }

    return {
      assets: result.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        evaluation: asset.commercialEvaluations[0]?.data ?? null,
      })),
    }
  })
