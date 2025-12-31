import { db } from "@/db"
import { asset, pkg, proj, packageMember, member } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, isNotNull, or } from "drizzle-orm"
import { z } from "zod"
import {
  getAuthContext,
  requirePackageAccess,
  requirePackageFullAccess,
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

export const renamePackageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ packageId: z.uuid(), name: z.string().trim().min(1) })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageFullAccess(
      ctx,
      data.packageId,
      ERRORS.NO_PERMISSION_RENAME("package")
    )

    const [updated] = await db
      .update(pkg)
      .set({ name: data.name })
      .where(eq(pkg.id, data.packageId))
      .returning({ id: pkg.id, name: pkg.name })

    return updated
  })

export const archivePackageFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageFullAccess(
      ctx,
      data.packageId,
      ERRORS.NO_PERMISSION_ARCHIVE("package")
    )

    await db
      .update(pkg)
      .set({ archivedAt: new Date() })
      .where(eq(pkg.id, data.packageId))

    return { success: true }
  })

export const restorePackageFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageFullAccess(
      ctx,
      data.packageId,
      ERRORS.NO_PERMISSION_RESTORE("package")
    )

    await db
      .update(pkg)
      .set({ archivedAt: null })
      .where(eq(pkg.id, data.packageId))

    return { success: true }
  })

export const listArchivedPackagesFn = createServerFn().handler(async () => {
  const ctx = await getAuthContext()

  const [orgMember] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.userId, ctx.userId),
        eq(member.organizationId, ctx.activeOrgId)
      )
    )
    .limit(1)

  if (orgMember?.role === "owner") {
    const packages = await db
      .select({
        id: pkg.id,
        name: pkg.name,
        projectId: pkg.projectId,
        projectName: proj.name,
        archivedAt: pkg.archivedAt,
      })
      .from(pkg)
      .innerJoin(proj, eq(pkg.projectId, proj.id))
      .where(
        and(eq(proj.organizationId, ctx.activeOrgId), isNotNull(pkg.archivedAt))
      )
      .orderBy(desc(pkg.archivedAt))
    return packages
  }

  const packages = await db
    .select({
      id: pkg.id,
      name: pkg.name,
      projectId: pkg.projectId,
      projectName: proj.name,
      archivedAt: pkg.archivedAt,
    })
    .from(pkg)
    .innerJoin(proj, eq(pkg.projectId, proj.id))
    .leftJoin(
      packageMember,
      and(
        eq(packageMember.packageId, pkg.id),
        eq(packageMember.userId, ctx.userId)
      )
    )
    .where(
      and(
        eq(proj.organizationId, ctx.activeOrgId),
        isNotNull(pkg.archivedAt),
        or(eq(proj.userId, ctx.userId), eq(packageMember.userId, ctx.userId))
      )
    )
    .groupBy(pkg.id, proj.name)
    .orderBy(desc(pkg.archivedAt))

  return packages
})
