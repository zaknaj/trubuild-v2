import { auth } from "@/auth/auth"
import { db } from "@/db"
import {
  asset,
  pkg,
  proj,
  member,
  user,
  projectMember,
  packageMember,
} from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, desc, eq, or, isNull } from "drizzle-orm"
import { z } from "zod"
import { getProjectAccess, getPackageAccess } from "@/lib/permissions"
import { getAuthContext } from "./server-fn"
import { ERRORS } from "@/lib/errors"

// ============================================================================
// Session & Organization
// ============================================================================

export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  return auth.api.getSession({ headers })
})

/** Call after login to link pending project/package memberships */
export const linkPendingMembershipsFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const ctx = await getAuthContext(false)
  await linkPendingMemberships(ctx.userId, ctx.userEmail)
})

/** Link pending project/package memberships and add user to orgs */
async function linkPendingMemberships(userId: string, email: string) {
  // Link pending project memberships
  await db
    .update(projectMember)
    .set({ userId })
    .where(and(eq(projectMember.email, email), isNull(projectMember.userId)))

  // Link pending package memberships
  await db
    .update(packageMember)
    .set({ userId })
    .where(and(eq(packageMember.email, email), isNull(packageMember.userId)))

  // Find all orgs from linked projects
  const projectOrgs = await db
    .selectDistinct({ organizationId: proj.organizationId })
    .from(projectMember)
    .innerJoin(proj, eq(projectMember.projectId, proj.id))
    .where(eq(projectMember.userId, userId))

  // Find all orgs from linked packages
  const packageOrgs = await db
    .selectDistinct({ organizationId: proj.organizationId })
    .from(packageMember)
    .innerJoin(pkg, eq(packageMember.packageId, pkg.id))
    .innerJoin(proj, eq(pkg.projectId, proj.id))
    .where(eq(packageMember.userId, userId))

  // Add user as member to each org they have project/package access to
  const orgIds = new Set([
    ...projectOrgs.map((o) => o.organizationId),
    ...packageOrgs.map((o) => o.organizationId),
  ])

  for (const organizationId of orgIds) {
    await db
      .insert(member)
      .values({
        id: globalThis.crypto.randomUUID(),
        userId,
        organizationId,
        role: "member",
        createdAt: new Date(),
      })
      .onConflictDoNothing()
  }
}

export const getOrgsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  return auth.api.listOrganizations({ headers })
})

export const getActiveOrgFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  return session?.session?.activeOrganizationId ?? null
})

export const setActiveOrgFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    await auth.api.setActiveOrganization({
      headers,
      body: { organizationId: data.organizationId },
    })
  })

export const setOrgCreatorAsAdminFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext(false)
    await db
      .update(member)
      .set({ role: "admin" })
      .where(
        and(
          eq(member.userId, ctx.userId),
          eq(member.organizationId, data.organizationId)
        )
      )
    return { success: true }
  })

// ============================================================================
// Organization Members & Invitations
// ============================================================================

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

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.email(),
      role: z.enum(["admin", "owner", "member"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const headers = getRequestHeaders()

    // Check if user is admin/owner
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

    if (
      !orgMember ||
      (orgMember.role !== "admin" && orgMember.role !== "owner")
    ) {
      throw new Error(ERRORS.NO_PERMISSION_INVITE("organization"))
    }

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

  if (orgMember?.role === "admin") {
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
    const { access } = await getProjectAccess(
      ctx.userId,
      data.projectId,
      ctx.activeOrgId
    )
    if (access === "none") throw new Error(ERRORS.NO_ACCESS("project"))

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

// ============================================================================
// Packages
// ============================================================================

export const createPackageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ projectId: z.uuid(), name: z.string().trim().min(1) })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(
      ctx.userId,
      data.projectId,
      ctx.activeOrgId
    )
    if (access === "none") throw new Error(ERRORS.NO_ACCESS("project"))

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
    const accessInfo = await getPackageAccess(
      ctx.userId,
      data.packageId,
      ctx.activeOrgId
    )
    if (accessInfo.access === "none")
      throw new Error(ERRORS.NO_ACCESS("package"))

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
    const { access } = await getPackageAccess(
      ctx.userId,
      data.packageId,
      ctx.activeOrgId
    )
    if (access === "none") throw new Error(ERRORS.NO_ACCESS("package"))

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

// ============================================================================
// Project Members & Invitations
// ============================================================================

export const getProjectMembersFn = createServerFn()
  .inputValidator(z.object({ projectId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(
      ctx.userId,
      data.projectId,
      ctx.activeOrgId
    )
    if (access === "none") throw new Error(ERRORS.NO_ACCESS("project"))

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
    const { access } = await getProjectAccess(
      ctx.userId,
      data.projectId,
      ctx.activeOrgId
    )
    if (access !== "full")
      throw new Error(ERRORS.NO_PERMISSION_INVITE("project"))

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

// ============================================================================
// Package Members & Invitations
// ============================================================================

export const getPackageMembersFn = createServerFn()
  .inputValidator(z.object({ packageId: z.uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getPackageAccess(
      ctx.userId,
      data.packageId,
      ctx.activeOrgId
    )
    if (access === "none") throw new Error(ERRORS.NO_ACCESS("package"))

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
    const { access } = await getPackageAccess(
      ctx.userId,
      data.packageId,
      ctx.activeOrgId
    )
    if (access !== "full")
      throw new Error(ERRORS.NO_PERMISSION_INVITE("package"))

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
