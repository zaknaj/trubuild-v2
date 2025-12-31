import { db } from "@/db"
import { asset, pkg, proj, packageMember } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  getAuthContext,
  requirePackageAccess,
  requireProjectFullAccess,
} from "../auth/auth-guards"
import { ERRORS } from "@/lib/errors"

// ============================================================================
// Packages
// ============================================================================

export const createPackageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ projectId: z.uuid(), name: z.string().trim().min(1) })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(
      ctx,
      data.projectId,
      ERRORS.NO_PERMISSION_CREATE_PACKAGE
    )

    const [newPackage] = await db
      .insert(pkg)
      .values({
        name: data.name,
        projectId: data.projectId,
      })
      .returning({
        id: pkg.id,
        name: pkg.name,
        projectId: pkg.projectId,
      })

    await db.insert(packageMember).values({
      packageId: newPackage.id,
      userId: ctx.userId,
      email: ctx.userEmail,
      role: "package_lead",
    })

    return newPackage
  })

export const getPackageWithAssetsFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageAccess(ctx, data.packageId)

    const [pkgRecord] = await db
      .select({
        id: pkg.id,
        name: pkg.name,
        projectId: pkg.projectId,
      })
      .from(pkg)
      .innerJoin(proj, eq(pkg.projectId, proj.id))
      .where(
        and(
          eq(pkg.id, data.packageId),
          eq(proj.organizationId, ctx.activeOrgId)
        )
      )
      .limit(1)

    if (!pkgRecord) throw new Error(ERRORS.NOT_FOUND("Package"))

    const [projectRecord] = await db
      .select({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
      })
      .from(proj)
      .where(eq(proj.id, pkgRecord.projectId))
      .limit(1)

    if (!projectRecord) throw new Error(ERRORS.NOT_FOUND("Parent project"))

    const assetsList = await db
      .select({
        id: asset.id,
        name: asset.name,
        packageId: asset.packageId,
      })
      .from(asset)
      .where(eq(asset.packageId, data.packageId))
      .orderBy(desc(asset.createdAt))

    return {
      package: pkgRecord,
      project: projectRecord,
      assets: assetsList,
    }
  })

// ============================================================================
// Assets
// ============================================================================

export const createAssetFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ packageId: z.uuid(), name: z.string().trim().min(1) })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageAccess(ctx, data.packageId)

    const [newAsset] = await db
      .insert(asset)
      .values({
        name: data.name,
        packageId: data.packageId,
      })
      .returning({
        id: asset.id,
        name: asset.name,
        packageId: asset.packageId,
      })

    return newAsset
  })
