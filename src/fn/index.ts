import { auth } from "@/auth/auth"
import { db } from "@/db"
import {
  asset,
  pkg,
  proj,
  member,
  user,
  invitation,
  projectMember,
  packageMember,
  projectInvitation,
  packageInvitation,
} from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, desc, eq, or } from "drizzle-orm"
import { z } from "zod"
import {
  canInviteToProject,
  canInviteToPackage,
  getProjectAccess,
  getPackageAccess,
} from "@/lib/permissions"
import { getAuthContext, getAuthContextNoOrg, serializeDates } from "./server-fn"

// ============================================================================
// Session & Organization
// ============================================================================

export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  return auth.api.getSession({ headers })
})

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
    const ctx = await getAuthContextNoOrg()
    await db
      .update(member)
      .set({ role: "admin" })
      .where(
        and(eq(member.userId, ctx.userId), eq(member.organizationId, data.organizationId))
      )
    return { success: true }
  })

// ============================================================================
// Organization Members & Invitations
// ============================================================================

export const getOrgMembersFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await getAuthContext()
    const members = await db
      .select({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        userId: member.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, ctx.activeOrgId))

    return members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
  })

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), role: z.enum(["admin", "owner", "member"]) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const headers = getRequestHeaders()
    await auth.api.createInvitation({
      headers,
      body: { email: data.email, role: data.role, organizationId: ctx.activeOrgId },
    })
    return { success: true, email: data.email, role: data.role }
  })

export const getInvitationsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await getAuthContext()
    const invitations = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })
      .from(invitation)
      .where(
        and(eq(invitation.organizationId, ctx.activeOrgId), eq(invitation.status, "pending"))
      )
      .orderBy(desc(invitation.createdAt))

    return invitations.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt?.toISOString() ?? null,
    }))
  })

export const getAllProjectInvitationsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await getAuthContext()
    const invitations = await db
      .select({
        id: projectInvitation.id,
        email: projectInvitation.email,
        role: projectInvitation.role,
        status: projectInvitation.status,
        expiresAt: projectInvitation.expiresAt,
        createdAt: projectInvitation.createdAt,
        projectId: projectInvitation.projectId,
        projectName: proj.name,
      })
      .from(projectInvitation)
      .innerJoin(proj, eq(projectInvitation.projectId, proj.id))
      .where(
        and(eq(proj.organizationId, ctx.activeOrgId), eq(projectInvitation.status, "pending"))
      )
      .orderBy(desc(projectInvitation.createdAt))

    return invitations.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  })

export const getAllPackageInvitationsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await getAuthContext()
    const invitations = await db
      .select({
        id: packageInvitation.id,
        email: packageInvitation.email,
        role: packageInvitation.role,
        status: packageInvitation.status,
        expiresAt: packageInvitation.expiresAt,
        createdAt: packageInvitation.createdAt,
        packageId: packageInvitation.packageId,
        packageName: pkg.name,
        projectId: pkg.projectId,
        projectName: proj.name,
      })
      .from(packageInvitation)
      .innerJoin(pkg, eq(packageInvitation.packageId, pkg.id))
      .innerJoin(proj, eq(pkg.projectId, proj.id))
      .where(
        and(eq(pkg.organizationId, ctx.activeOrgId), eq(packageInvitation.status, "pending"))
      )
      .orderBy(desc(packageInvitation.createdAt))

    return invitations.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  })

// ============================================================================
// Projects
// ============================================================================

export const listProjectsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await getAuthContext()

    const [orgMember] = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, ctx.userId), eq(member.organizationId, ctx.activeOrgId)))
      .limit(1)

    if (orgMember?.role === "admin") {
      const projects = await db
        .select()
        .from(proj)
        .where(eq(proj.organizationId, ctx.activeOrgId))
        .orderBy(desc(proj.createdAt))
      return projects.map(serializeDates)
    }

    const projects = await db
      .select({
        id: proj.id,
        name: proj.name,
        userId: proj.userId,
        organizationId: proj.organizationId,
        createdAt: proj.createdAt,
        updatedAt: proj.updatedAt,
      })
      .from(proj)
      .leftJoin(
        projectMember,
        and(eq(projectMember.projectId, proj.id), eq(projectMember.userId, ctx.userId))
      )
      .where(
        and(
          eq(proj.organizationId, ctx.activeOrgId),
          or(eq(proj.userId, ctx.userId), eq(projectMember.userId, ctx.userId))
        )
      )
      .groupBy(proj.id)
      .orderBy(desc(proj.createdAt))

    return projects.map(serializeDates)
  })

export const createProjectFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    const [project] = await db
      .insert(proj)
      .values({ name: data.name, userId: ctx.userId, organizationId: ctx.activeOrgId })
      .returning()

    await db.insert(projectMember).values({
      projectId: project.id,
      userId: ctx.userId,
      role: "project_lead",
    })

    await ensureOrgMembership(ctx.userId, ctx.activeOrgId)
    return serializeDates(project)
  })

export const getProjectWithPackagesFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(ctx.userId, data.projectId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this project.")

    const [project] = await db
      .select()
      .from(proj)
      .where(and(eq(proj.id, data.projectId), eq(proj.organizationId, ctx.activeOrgId)))
      .limit(1)

    if (!project) throw new Error("Project not found.")

    const packages = await db
      .select()
      .from(pkg)
      .where(eq(pkg.projectId, data.projectId))
      .orderBy(desc(pkg.createdAt))

    return { project: serializeDates(project), packages: packages.map(serializeDates) }
  })

// ============================================================================
// Packages
// ============================================================================

export const createPackageFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.string().uuid(), name: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(ctx.userId, data.projectId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this project.")

    const [newPackage] = await db
      .insert(pkg)
      .values({
        name: data.name,
        projectId: data.projectId,
        userId: ctx.userId,
        organizationId: ctx.activeOrgId,
      })
      .returning()

    await db.insert(packageMember).values({
      packageId: newPackage.id,
      userId: ctx.userId,
      role: "package_lead",
    })

    await ensureOrgMembership(ctx.userId, ctx.activeOrgId)
    return serializeDates(newPackage)
  })

export const getPackageWithAssetsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const accessInfo = await getPackageAccess(ctx.userId, data.packageId, ctx.activeOrgId)
    if (accessInfo.access === "none") throw new Error("You don't have access to this package.")

    const [pkgRecord] = await db
      .select()
      .from(pkg)
      .where(and(eq(pkg.id, data.packageId), eq(pkg.organizationId, ctx.activeOrgId)))
      .limit(1)

    if (!pkgRecord) throw new Error("Package not found.")

    const [projectRecord] = await db
      .select()
      .from(proj)
      .where(eq(proj.id, pkgRecord.projectId))
      .limit(1)

    if (!projectRecord) throw new Error("Parent project not found.")

    const assetsList = await db
      .select()
      .from(asset)
      .where(eq(asset.packageId, data.packageId))
      .orderBy(desc(asset.createdAt))

    return {
      package: serializeDates(pkgRecord),
      project: serializeDates(projectRecord),
      assets: assetsList.map(serializeDates),
    }
  })

// ============================================================================
// Assets
// ============================================================================

export const createAssetFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.string().uuid(), name: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getPackageAccess(ctx.userId, data.packageId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this package.")

    const [newAsset] = await db
      .insert(asset)
      .values({
        name: data.name,
        packageId: data.packageId,
        userId: ctx.userId,
        organizationId: ctx.activeOrgId,
      })
      .returning()

    return serializeDates(newAsset)
  })

// ============================================================================
// Project Members & Invitations
// ============================================================================

export const getProjectMembersFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(ctx.userId, data.projectId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this project.")

    const members = await db
      .select({
        id: projectMember.id,
        role: projectMember.role,
        createdAt: projectMember.createdAt,
        userId: projectMember.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(projectMember)
      .innerJoin(user, eq(projectMember.userId, user.id))
      .where(eq(projectMember.projectId, data.projectId))

    return members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
  })

export const getProjectInvitationsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getProjectAccess(ctx.userId, data.projectId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this project.")

    const invitations = await db
      .select({
        id: projectInvitation.id,
        email: projectInvitation.email,
        role: projectInvitation.role,
        status: projectInvitation.status,
        expiresAt: projectInvitation.expiresAt,
        createdAt: projectInvitation.createdAt,
      })
      .from(projectInvitation)
      .where(
        and(
          eq(projectInvitation.projectId, data.projectId),
          eq(projectInvitation.status, "pending")
        )
      )
      .orderBy(desc(projectInvitation.createdAt))

    return invitations.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  })

export const inviteProjectMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(["project_lead", "commercial_lead", "technical_lead"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const canInvite = await canInviteToProject(ctx.userId, data.projectId, ctx.activeOrgId)
    if (!canInvite)
      throw new Error("You don't have permission to invite members to this project.")

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [inv] = await db
      .insert(projectInvitation)
      .values({
        projectId: data.projectId,
        email: data.email,
        role: data.role,
        inviterId: ctx.userId,
        expiresAt,
      })
      .returning()

    return {
      success: true,
      invitation: {
        ...inv,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      },
    }
  })

// ============================================================================
// Package Members & Invitations
// ============================================================================

export const getPackageMembersFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getPackageAccess(ctx.userId, data.packageId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this package.")

    const members = await db
      .select({
        id: packageMember.id,
        role: packageMember.role,
        createdAt: packageMember.createdAt,
        userId: packageMember.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(packageMember)
      .innerJoin(user, eq(packageMember.userId, user.id))
      .where(eq(packageMember.packageId, data.packageId))

    return members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
  })

export const getPackageInvitationsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ packageId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const { access } = await getPackageAccess(ctx.userId, data.packageId, ctx.activeOrgId)
    if (access === "none") throw new Error("You don't have access to this package.")

    const invitations = await db
      .select({
        id: packageInvitation.id,
        email: packageInvitation.email,
        role: packageInvitation.role,
        status: packageInvitation.status,
        expiresAt: packageInvitation.expiresAt,
        createdAt: packageInvitation.createdAt,
      })
      .from(packageInvitation)
      .where(
        and(
          eq(packageInvitation.packageId, data.packageId),
          eq(packageInvitation.status, "pending")
        )
      )
      .orderBy(desc(packageInvitation.createdAt))

    return invitations.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  })

export const invitePackageMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(["package_lead", "commercial_team", "technical_team"]),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const canInvite = await canInviteToPackage(ctx.userId, data.packageId, ctx.activeOrgId)
    if (!canInvite)
      throw new Error("You don't have permission to invite members to this package.")

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [inv] = await db
      .insert(packageInvitation)
      .values({
        packageId: data.packageId,
        email: data.email,
        role: data.role,
        inviterId: ctx.userId,
        expiresAt,
      })
      .returning()

    return {
      success: true,
      invitation: {
        ...inv,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      },
    }
  })

// ============================================================================
// Invitation Acceptance
// ============================================================================

export const acceptProjectInvitationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ invitationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContextNoOrg()

    const [inv] = await db
      .select()
      .from(projectInvitation)
      .where(eq(projectInvitation.id, data.invitationId))
      .limit(1)

    if (!inv) throw new Error("Invitation not found.")
    if (inv.status !== "pending") throw new Error("Invitation already processed.")
    if (inv.expiresAt < new Date()) throw new Error("Invitation expired.")
    if (ctx.userEmail !== inv.email) throw new Error("Invitation is for a different email.")

    const [project] = await db
      .select({ organizationId: proj.organizationId })
      .from(proj)
      .where(eq(proj.id, inv.projectId))
      .limit(1)

    if (!project) throw new Error("Project not found.")

    const [existing] = await db
      .select()
      .from(projectMember)
      .where(
        and(eq(projectMember.projectId, inv.projectId), eq(projectMember.userId, ctx.userId))
      )
      .limit(1)

    if (!existing) {
      await db.insert(projectMember).values({
        projectId: inv.projectId,
        userId: ctx.userId,
        role: inv.role,
      })
      await ensureOrgMembership(ctx.userId, project.organizationId)
    }

    await db
      .update(projectInvitation)
      .set({ status: "accepted" })
      .where(eq(projectInvitation.id, data.invitationId))

    return { success: true }
  })

export const acceptPackageInvitationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ invitationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContextNoOrg()

    const [inv] = await db
      .select()
      .from(packageInvitation)
      .where(eq(packageInvitation.id, data.invitationId))
      .limit(1)

    if (!inv) throw new Error("Invitation not found.")
    if (inv.status !== "pending") throw new Error("Invitation already processed.")
    if (inv.expiresAt < new Date()) throw new Error("Invitation expired.")
    if (ctx.userEmail !== inv.email) throw new Error("Invitation is for a different email.")

    const [pkgRecord] = await db
      .select({ organizationId: pkg.organizationId })
      .from(pkg)
      .where(eq(pkg.id, inv.packageId))
      .limit(1)

    if (!pkgRecord) throw new Error("Package not found.")

    const [existing] = await db
      .select()
      .from(packageMember)
      .where(
        and(eq(packageMember.packageId, inv.packageId), eq(packageMember.userId, ctx.userId))
      )
      .limit(1)

    if (!existing) {
      await db.insert(packageMember).values({
        packageId: inv.packageId,
        userId: ctx.userId,
        role: inv.role,
      })
      await ensureOrgMembership(ctx.userId, pkgRecord.organizationId)
    }

    await db
      .update(packageInvitation)
      .set({ status: "accepted" })
      .where(eq(packageInvitation.id, data.invitationId))

    return { success: true }
  })

// ============================================================================
// Helpers
// ============================================================================

async function ensureOrgMembership(userId: string, organizationId: string) {
  const [existing] = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)

  if (!existing) {
    await db.insert(member).values({
      id: globalThis.crypto.randomUUID(),
      userId,
      organizationId,
      role: "member",
      createdAt: new Date(),
    })
  }
}
