import { db } from "@/db"
import { pkg, proj, member, projectMember } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, or } from "drizzle-orm"
import { z } from "zod"
import {
  getAuthContext,
  requireCanCreateProject,
  requireProjectAccess,
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
      .where(eq(proj.organizationId, ctx.activeOrgId))
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
      .where(eq(pkg.projectId, data.projectId))
      .orderBy(desc(pkg.createdAt))

    return {
      project,
      packages,
    }
  })
