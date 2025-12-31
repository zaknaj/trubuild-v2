import { db } from "@/db"
import { pkg, proj, member, projectMember } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm"
import { z } from "zod"
import {
  getAuthContext,
  requireCanCreateProject,
  requireProjectAccess,
  requireProjectFullAccess,
} from "../auth/auth-guards"
import { ERRORS } from "@/lib/errors"

// ============================================================================
// Projects
// ============================================================================

export const listProjectsFn = createServerFn().handler(async () => {
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
    const projects = await db
      .select({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
      })
      .from(proj)
      .where(and(eq(proj.organizationId, ctx.activeOrgId), isNull(proj.archivedAt)))
      .orderBy(desc(proj.createdAt))
    return projects
  }

  const projects = await db
    .select({
      id: proj.id,
      name: proj.name,
      userId: proj.userId,
      organizationId: proj.organizationId,
    })
    .from(proj)
    .leftJoin(
      projectMember,
      and(
        eq(projectMember.projectId, proj.id),
        eq(projectMember.userId, ctx.userId)
      )
    )
    .where(
      and(
        eq(proj.organizationId, ctx.activeOrgId),
        isNull(proj.archivedAt),
        or(eq(proj.userId, ctx.userId), eq(projectMember.userId, ctx.userId))
      )
    )
    .groupBy(proj.id)
    .orderBy(desc(proj.createdAt))

  return projects
})

export const createProjectFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireCanCreateProject(ctx)

    const [project] = await db
      .insert(proj)
      .values({
        name: data.name,
        userId: ctx.userId,
        organizationId: ctx.activeOrgId,
      })
      .returning({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
      })

    await db.insert(projectMember).values({
      projectId: project.id,
      userId: ctx.userId,
      email: ctx.userEmail,
      role: "project_lead",
    })

    return project
  })

export const getProjectWithPackagesFn = createServerFn()
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectAccess(ctx, data.projectId)

    const [project] = await db
      .select({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
      })
      .from(proj)
      .where(
        and(
          eq(proj.id, data.projectId),
          eq(proj.organizationId, ctx.activeOrgId)
        )
      )
      .limit(1)

    if (!project) throw new Error(ERRORS.NOT_FOUND("Project"))

    const packages = await db
      .select({
        id: pkg.id,
        name: pkg.name,
        projectId: pkg.projectId,
      })
      .from(pkg)
      .where(and(eq(pkg.projectId, data.projectId), isNull(pkg.archivedAt)))
      .orderBy(desc(pkg.createdAt))

    return {
      project,
      packages,
    }
  })

export const renameProjectFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.uuid(), name: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(ctx, data.projectId, ERRORS.NO_PERMISSION_RENAME("project"))

    const [updated] = await db
      .update(proj)
      .set({ name: data.name })
      .where(eq(proj.id, data.projectId))
      .returning({ id: proj.id, name: proj.name })

    return updated
  })

export const archiveProjectFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(ctx, data.projectId, ERRORS.NO_PERMISSION_ARCHIVE("project"))

    await db
      .update(proj)
      .set({ archivedAt: new Date() })
      .where(eq(proj.id, data.projectId))

    return { success: true }
  })

export const restoreProjectFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(ctx, data.projectId, ERRORS.NO_PERMISSION_RESTORE("project"))

    await db
      .update(proj)
      .set({ archivedAt: null })
      .where(eq(proj.id, data.projectId))

    return { success: true }
  })

export const listArchivedProjectsFn = createServerFn().handler(async () => {
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
    const projects = await db
      .select({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
        archivedAt: proj.archivedAt,
      })
      .from(proj)
      .where(and(eq(proj.organizationId, ctx.activeOrgId), isNotNull(proj.archivedAt)))
      .orderBy(desc(proj.archivedAt))
    return projects
  }

  const projects = await db
    .select({
      id: proj.id,
      name: proj.name,
      userId: proj.userId,
      organizationId: proj.organizationId,
      archivedAt: proj.archivedAt,
    })
    .from(proj)
    .leftJoin(
      projectMember,
      and(
        eq(projectMember.projectId, proj.id),
        eq(projectMember.userId, ctx.userId)
      )
    )
    .where(
      and(
        eq(proj.organizationId, ctx.activeOrgId),
        isNotNull(proj.archivedAt),
        or(eq(proj.userId, ctx.userId), eq(projectMember.userId, ctx.userId))
      )
    )
    .groupBy(proj.id)
    .orderBy(desc(proj.archivedAt))

  return projects
})
