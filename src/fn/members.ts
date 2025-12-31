import { auth } from "@/auth/auth"
import { db } from "@/db"
import {
  member,
  user,
  projectMember,
  packageMember,
  invitation,
} from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { getProjectAccess, getPackageAccess } from "@/lib/permissions"
import {
  getAuthContext,
  requireOrgOwner,
  requireProjectAccess,
  requireProjectFullAccess,
  requirePackageAccess,
  requirePackageFullAccess,
} from "../auth/auth-guards"
import { ERRORS } from "@/lib/errors"

// ============================================================================
// Organization Members & Invitations
// ============================================================================

export const getCurrentUserOrgRoleFn = createServerFn().handler(async () => {
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

  return { role: orgMember?.role ?? null }
})

export const getOrgMembersFn = createServerFn().handler(async () => {
  const ctx = await getAuthContext()
  const members = await db
    .select({
      id: member.id,
      role: member.role,
      userId: member.userId,
      userName: user.name,
      email: user.email,
      userImage: user.image,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, ctx.activeOrgId))

  return members
})

export const getOrgPendingInvitesFn = createServerFn().handler(async () => {
  const ctx = await getAuthContext()
  const pending = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, ctx.activeOrgId),
        eq(invitation.status, "pending")
      )
    )

  return pending
})

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.email(),
      role: z.enum(["owner", "admin", "member"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireOrgOwner(ctx)
    const headers = getRequestHeaders()

    await auth.api.createInvitation({
      headers,
      body: {
        email: data.email,
        role: data.role,
        organizationId: ctx.activeOrgId,
      },
    })
    return { success: true, email: data.email, role: data.role }
  })

// ============================================================================
// Project Members & Invitations
// ============================================================================

export const getProjectMembersFn = createServerFn()
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectAccess(ctx, data.projectId)

    const members = await db
      .select({
        role: projectMember.role,
        userId: projectMember.userId,
        email: projectMember.email,
        userName: user.name,
        userImage: user.image,
      })
      .from(projectMember)
      .leftJoin(user, eq(projectMember.userId, user.id))
      .where(eq(projectMember.projectId, data.projectId))

    return members.map((m) => ({
      ...m,
      id: `${data.projectId}-${m.email}`,
    }))
  })

export const getProjectAccessFn = createServerFn()
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access, orgRole, projectRole, isCreator } = await getProjectAccess(
      ctx.userId,
      data.projectId,
      ctx.activeOrgId
    )
    return { access, orgRole, projectRole, isCreator }
  })

export const addProjectMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.uuid(),
      email: z.email(),
      role: z.enum(["project_lead", "commercial_lead", "technical_lead"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(
      ctx,
      data.projectId,
      ERRORS.NO_PERMISSION_INVITE("project")
    )

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, data.email))
      .limit(1)

    await db
      .insert(projectMember)
      .values({
        projectId: data.projectId,
        email: data.email,
        userId: existingUser?.id ?? null,
        role: data.role,
      })
      .onConflictDoNothing()

    return { success: true }
  })

export const removeProjectMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.uuid(),
      email: z.email(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireProjectFullAccess(
      ctx,
      data.projectId,
      ERRORS.NO_PERMISSION_REMOVE("project")
    )

    await db
      .delete(projectMember)
      .where(
        and(
          eq(projectMember.projectId, data.projectId),
          eq(projectMember.email, data.email)
        )
      )

    return { success: true }
  })

// ============================================================================
// Package Members & Invitations
// ============================================================================

export const getPackageMembersFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageAccess(ctx, data.packageId)

    const members = await db
      .select({
        role: packageMember.role,
        userId: packageMember.userId,
        email: packageMember.email,
        userName: user.name,
        userImage: user.image,
      })
      .from(packageMember)
      .leftJoin(user, eq(packageMember.userId, user.id))
      .where(eq(packageMember.packageId, data.packageId))

    return members.map((m) => ({
      ...m,
      id: `${data.packageId}-${m.email}`,
    }))
  })

export const getPackageAccessFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access, orgRole, projectRole, packageRole, isProjectCreator } =
      await getPackageAccess(ctx.userId, data.packageId, ctx.activeOrgId)
    return { access, orgRole, projectRole, packageRole, isProjectCreator }
  })

export const addPackageMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.uuid(),
      email: z.email(),
      role: z.enum(["package_lead", "commercial_team", "technical_team"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageFullAccess(
      ctx,
      data.packageId,
      ERRORS.NO_PERMISSION_INVITE("package")
    )

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, data.email))
      .limit(1)

    await db
      .insert(packageMember)
      .values({
        packageId: data.packageId,
        email: data.email,
        userId: existingUser?.id ?? null,
        role: data.role,
      })
      .onConflictDoNothing()

    return { success: true }
  })

export const removePackageMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.uuid(),
      email: z.email(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requirePackageFullAccess(
      ctx,
      data.packageId,
      ERRORS.NO_PERMISSION_REMOVE("package")
    )

    await db
      .delete(packageMember)
      .where(
        and(
          eq(packageMember.packageId, data.packageId),
          eq(packageMember.email, data.email)
        )
      )

    return { success: true }
  })
