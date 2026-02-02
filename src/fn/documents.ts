import { db } from "@/db"
import { document, pkg, asset, proj } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
import { getAuthContext, requirePackageAccess } from "../auth/auth-guards"
import { ERRORS } from "@/lib/errors"
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteObject,
  generateDocumentKey,
} from "@/lib/s3"

// Document categories
const documentCategorySchema = z.enum([
  "rfp",
  "boq",
  "pte",
  "vendor_proposal",
  "criteria",
  "other",
])

export type DocumentCategory = z.infer<typeof documentCategorySchema>

// ============================================================================
// Get Upload URL
// ============================================================================

export const getDocumentUploadUrlFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      filename: z.string().min(1),
      contentType: z.string().min(1),
      category: documentCategorySchema,
      // Either packageId or assetId must be provided
      packageId: z.string().uuid().optional(),
      assetId: z.string().uuid().optional(),
      contractorId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Determine the entity ID for the S3 key
    let entityId: string
    let packageId: string | undefined

    if (data.assetId) {
      // Get the package from the asset
      const [assetRecord] = await db
        .select({ packageId: asset.packageId })
        .from(asset)
        .where(eq(asset.id, data.assetId))
        .limit(1)

      if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))

      packageId = assetRecord.packageId
      entityId = data.assetId
    } else if (data.packageId) {
      packageId = data.packageId
      entityId = data.packageId
    } else {
      throw new Error("Either packageId or assetId must be provided")
    }

    // Check user has access to the package
    await requirePackageAccess(ctx, packageId)

    // Generate unique S3 key
    const key = generateDocumentKey(entityId, data.category, data.filename)

    // Generate presigned upload URL
    const uploadUrl = await getPresignedUploadUrl(key, data.contentType)

    return {
      uploadUrl,
      key,
    }
  })

// ============================================================================
// Create Document Record (after successful upload)
// ============================================================================

export const createDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      key: z.string().min(1),
      contentType: z.string().optional(),
      size: z.number().int().positive().optional(),
      category: documentCategorySchema,
      packageId: z.string().uuid().optional(),
      assetId: z.string().uuid().optional(),
      contractorId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Determine the package for access check
    let packageId: string | undefined

    if (data.assetId) {
      const [assetRecord] = await db
        .select({ packageId: asset.packageId })
        .from(asset)
        .where(eq(asset.id, data.assetId))
        .limit(1)

      if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
      packageId = assetRecord.packageId
    } else if (data.packageId) {
      packageId = data.packageId
    } else {
      throw new Error("Either packageId or assetId must be provided")
    }

    await requirePackageAccess(ctx, packageId)

    const [newDocument] = await db
      .insert(document)
      .values({
        name: data.name,
        key: data.key,
        contentType: data.contentType,
        size: data.size,
        category: data.category,
        packageId: data.packageId,
        assetId: data.assetId,
        contractorId: data.contractorId,
        uploadedBy: ctx.userId,
      })
      .returning({
        id: document.id,
        name: document.name,
        key: document.key,
        contentType: document.contentType,
        size: document.size,
        category: document.category,
        packageId: document.packageId,
        assetId: document.assetId,
        contractorId: document.contractorId,
        createdAt: document.createdAt,
      })

    return newDocument
  })

// ============================================================================
// List Documents
// ============================================================================

export const listDocumentsFn = createServerFn()
  .inputValidator(
    z.object({
      packageId: z.string().uuid().optional(),
      assetId: z.string().uuid().optional(),
      category: documentCategorySchema.optional(),
      contractorId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Determine the package for access check
    let packageId: string | undefined

    if (data.assetId) {
      const [assetRecord] = await db
        .select({ packageId: asset.packageId })
        .from(asset)
        .where(eq(asset.id, data.assetId))
        .limit(1)

      if (!assetRecord) throw new Error(ERRORS.NOT_FOUND("Asset"))
      packageId = assetRecord.packageId
    } else if (data.packageId) {
      packageId = data.packageId
    } else {
      throw new Error("Either packageId or assetId must be provided")
    }

    await requirePackageAccess(ctx, packageId)

    // Build conditions
    const conditions = []
    if (data.packageId) {
      conditions.push(eq(document.packageId, data.packageId))
    }
    if (data.assetId) {
      conditions.push(eq(document.assetId, data.assetId))
    }
    if (data.category) {
      conditions.push(eq(document.category, data.category))
    }
    if (data.contractorId) {
      conditions.push(eq(document.contractorId, data.contractorId))
    }

    const documents = await db
      .select({
        id: document.id,
        name: document.name,
        key: document.key,
        contentType: document.contentType,
        size: document.size,
        category: document.category,
        packageId: document.packageId,
        assetId: document.assetId,
        contractorId: document.contractorId,
        createdAt: document.createdAt,
      })
      .from(document)
      .where(and(...conditions))
      .orderBy(desc(document.createdAt))

    return documents
  })

// ============================================================================
// Get Download URL
// ============================================================================

export const getDocumentDownloadUrlFn = createServerFn()
  .inputValidator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get document
    const [doc] = await db
      .select({
        id: document.id,
        key: document.key,
        name: document.name,
        packageId: document.packageId,
        assetId: document.assetId,
      })
      .from(document)
      .where(eq(document.id, data.documentId))
      .limit(1)

    if (!doc) throw new Error(ERRORS.NOT_FOUND("Document"))

    // Determine package for access check
    let packageId: string | undefined

    if (doc.assetId) {
      const [assetRecord] = await db
        .select({ packageId: asset.packageId })
        .from(asset)
        .where(eq(asset.id, doc.assetId))
        .limit(1)

      packageId = assetRecord?.packageId
    } else {
      packageId = doc.packageId ?? undefined
    }

    if (packageId) {
      await requirePackageAccess(ctx, packageId)
    }

    const downloadUrl = await getPresignedDownloadUrl(doc.key)

    return {
      downloadUrl,
      filename: doc.name,
    }
  })

// ============================================================================
// Delete Document
// ============================================================================

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    // Get document
    const [doc] = await db
      .select({
        id: document.id,
        key: document.key,
        packageId: document.packageId,
        assetId: document.assetId,
      })
      .from(document)
      .where(eq(document.id, data.documentId))
      .limit(1)

    if (!doc) throw new Error(ERRORS.NOT_FOUND("Document"))

    // Determine package for access check
    let packageId: string | undefined

    if (doc.assetId) {
      const [assetRecord] = await db
        .select({ packageId: asset.packageId })
        .from(asset)
        .where(eq(asset.id, doc.assetId))
        .limit(1)

      packageId = assetRecord?.packageId
    } else {
      packageId = doc.packageId ?? undefined
    }

    if (packageId) {
      await requirePackageAccess(ctx, packageId)
    }

    // Delete from S3
    await deleteObject(doc.key)

    // Delete from database
    await db.delete(document).where(eq(document.id, data.documentId))

    return { success: true }
  })
