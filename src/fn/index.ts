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
  resolveProjectAccess,
  resolvePackageAccess,
} from "@/lib/permissions"

const serializeDates = <
  T extends {
    createdAt: Date | null | undefined
    updatedAt: Date | null | undefined
  },
>(
  record: T
) => ({
  ...record,
  createdAt: record.createdAt ? record.createdAt.toISOString() : null,
  updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
})

export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  return session
})

export const getOrgsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const orgs = await auth.api.listOrganizations({ headers })
  return orgs
})

export const getActiveOrgFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  return session?.session?.activeOrganizationId ?? null
})

export const setActiveOrgFn = createServerFn()
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    auth.api.setActiveOrganization({
      headers,
      body: { organizationId: data.organizationId },
    })
  })

export const setOrgCreatorAsAdminFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    if (!userId) {
      throw new Error("You must be logged in to set organization admin role.")
    }

    // Update the member record to set role to admin
    await db
      .update(member)
      .set({ role: "admin" })
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, data.organizationId)
        )
      )

    return { success: true }
  })

/**
 * Helper function to ensure a user is a member of an organization
 * If they're not a member, adds them with role "member"
 */
async function ensureOrgMembership(
  userId: string,
  organizationId: string
): Promise<void> {
  // Check if user is already a member
  const [existingMember] = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1)

  // If not a member, add them with role "member"
  if (!existingMember) {
    // Generate a unique ID (better-auth format: typically uses crypto.randomUUID())
    const memberId = globalThis.crypto.randomUUID()
    await db.insert(member).values({
      id: memberId,
      userId,
      organizationId,
      role: "member",
      createdAt: new Date(),
    })
  }
}

export const getOrgMembersFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

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
    .where(eq(member.organizationId, activeOrgId))

  return members.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }))
})

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email("Invalid email address"),
      role: z.enum(["admin", "owner", "member"]),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const activeOrgId = session?.session?.activeOrganizationId
    if (!session?.user || !activeOrgId) {
      throw new Error("You must have an active organization to invite members.")
    }

    await auth.api.createInvitation({
      headers,
      body: {
        email: data.email,
        role: data.role,
        organizationId: activeOrgId,
      },
    })

    return { success: true, email: data.email, role: data.role }
  })

export const getInvitationsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

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
      and(
        eq(invitation.organizationId, activeOrgId),
        eq(invitation.status, "pending")
      )
    )
    .orderBy(desc(invitation.createdAt))

  return invitations.map((inv) => ({
    ...inv,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt?.toISOString() ?? null,
  }))
})

export const getAllProjectInvitationsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

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
      and(
        eq(proj.organizationId, activeOrgId),
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

export const getAllPackageInvitationsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

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
      and(
        eq(pkg.organizationId, activeOrgId),
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

export const listProjectsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const userId = session?.user?.id
  const activeOrgId = session?.session?.activeOrganizationId
  if (!userId || !activeOrgId) {
    return []
  }

  // Get user's org role
  const [orgMember] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, activeOrgId))
    )
    .limit(1)

  const orgRole = orgMember?.role as
    | "admin"
    | "project_owner"
    | "member"
    | undefined

  // Org admins see all projects
  if (orgRole === "admin") {
    const projects = await db
      .select()
      .from(proj)
      .where(eq(proj.organizationId, activeOrgId))
      .orderBy(desc(proj.createdAt))

    return projects.map(serializeDates)
  }

  // For project owners and members, get projects they created or are members of
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
      and(
        eq(projectMember.projectId, proj.id),
        eq(projectMember.userId, userId)
      )
    )
    .where(
      and(
        eq(proj.organizationId, activeOrgId),
        or(
          eq(proj.userId, userId), // Created by user
          eq(projectMember.userId, userId) // Member of project
        )
      )
    )
    .groupBy(proj.id)
    .orderBy(desc(proj.createdAt))

  return projects.map(serializeDates)
})

export const createProjectFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1, "Project name is required"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error(
        "Select an active organization before creating a project."
      )
    }

    const [project] = await db
      .insert(proj)
      .values({
        name: data.name,
        userId,
        organizationId: activeOrgId,
      })
      .returning()

    // Auto-create project_lead membership for creator
    await db.insert(projectMember).values({
      projectId: project.id,
      userId,
      role: "project_lead",
    })

    // Ensure user is an org member
    await ensureOrgMembership(userId, activeOrgId)

    return serializeDates(project)
  })

export const getProjectWithPackagesFn = createServerFn()
  .inputValidator(
    z.object({
      projectId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    const [project] = await db
      .select()
      .from(proj)
      .where(
        and(eq(proj.id, data.projectId), eq(proj.organizationId, activeOrgId))
      )
      .limit(1)

    if (!project) {
      throw new Error("Project not found.")
    }

    // Check access
    const access = await resolveProjectAccess(
      userId,
      data.projectId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this project.")
    }

    const packages = await db
      .select()
      .from(pkg)
      .where(eq(pkg.projectId, data.projectId))
      .orderBy(desc(pkg.createdAt))

    return {
      project: serializeDates(project),
      packages: packages.map(serializeDates),
    }
  })

export const createPackageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.uuid(),
      name: z.string().trim().min(1, "Package name is required"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check access to project
    const access = await resolveProjectAccess(
      userId,
      data.projectId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this project.")
    }

    const [project] = await db
      .select({ id: proj.id })
      .from(proj)
      .where(
        and(eq(proj.id, data.projectId), eq(proj.organizationId, activeOrgId))
      )
      .limit(1)

    if (!project) {
      throw new Error("Project not found.")
    }

    const [newPackage] = await db
      .insert(pkg)
      .values({
        name: data.name,
        projectId: data.projectId,
        userId,
        organizationId: activeOrgId,
      })
      .returning()

    // Auto-create package_lead membership for creator
    await db.insert(packageMember).values({
      packageId: newPackage.id,
      userId,
      role: "package_lead",
    })

    // Ensure user is an org member
    await ensureOrgMembership(userId, activeOrgId)

    return serializeDates(newPackage)
  })

export const getPackageWithAssetsFn = createServerFn()
  .inputValidator(
    z.object({
      packageId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    const [pkgRecord] = await db
      .select()
      .from(pkg)
      .where(
        and(eq(pkg.id, data.packageId), eq(pkg.organizationId, activeOrgId))
      )
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
    }

    // Check access
    const access = await resolvePackageAccess(
      userId,
      data.packageId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this package.")
    }

    const [projectRecord] = await db
      .select()
      .from(proj)
      .where(eq(proj.id, pkgRecord.projectId))
      .limit(1)

    if (!projectRecord) {
      throw new Error("Parent project not found.")
    }

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

export const createAssetFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.uuid(),
      name: z.string().trim().min(1, "Asset name is required"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    const [pkgRecord] = await db
      .select({ id: pkg.id })
      .from(pkg)
      .where(
        and(eq(pkg.id, data.packageId), eq(pkg.organizationId, activeOrgId))
      )
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
    }

    // Check access - need at least some access to create assets
    const access = await resolvePackageAccess(
      userId,
      data.packageId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this package.")
    }

    const [newAsset] = await db
      .insert(asset)
      .values({
        name: data.name,
        packageId: data.packageId,
        userId,
        organizationId: activeOrgId,
      })
      .returning()

    return serializeDates(newAsset)
  })

// Project invitation and member functions

export const inviteProjectMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.uuid(),
      email: z.string().email("Invalid email address"),
      role: z.enum(["project_lead", "commercial_lead", "technical_lead"]),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check permission to invite
    const canInvite = await canInviteToProject(
      userId,
      data.projectId,
      activeOrgId
    )
    if (!canInvite) {
      throw new Error(
        "You don't have permission to invite members to this project."
      )
    }

    // Verify project exists and belongs to org
    const [project] = await db
      .select({ id: proj.id })
      .from(proj)
      .where(
        and(eq(proj.id, data.projectId), eq(proj.organizationId, activeOrgId))
      )
      .limit(1)

    if (!project) {
      throw new Error("Project not found.")
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [invitation] = await db
      .insert(projectInvitation)
      .values({
        projectId: data.projectId,
        email: data.email,
        role: data.role,
        inviterId: userId,
        expiresAt,
      })
      .returning()

    return {
      success: true,
      invitation: {
        ...invitation,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
      },
    }
  })

export const getProjectMembersFn = createServerFn()
  .inputValidator(
    z.object({
      projectId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check access
    const access = await resolveProjectAccess(
      userId,
      data.projectId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this project.")
    }

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

    return members.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  })

export const getProjectInvitationsFn = createServerFn()
  .inputValidator(
    z.object({
      projectId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check access
    const access = await resolveProjectAccess(
      userId,
      data.projectId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this project.")
    }

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

// Package invitation and member functions

export const invitePackageMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.uuid(),
      email: z.string().email("Invalid email address"),
      role: z.enum(["package_lead", "commercial_team", "technical_team"]),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check permission to invite
    const canInvite = await canInviteToPackage(
      userId,
      data.packageId,
      activeOrgId
    )
    if (!canInvite) {
      throw new Error(
        "You don't have permission to invite members to this package."
      )
    }

    // Verify package exists and belongs to org
    const [pkgRecord] = await db
      .select({ id: pkg.id })
      .from(pkg)
      .where(
        and(eq(pkg.id, data.packageId), eq(pkg.organizationId, activeOrgId))
      )
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [invitation] = await db
      .insert(packageInvitation)
      .values({
        packageId: data.packageId,
        email: data.email,
        role: data.role,
        inviterId: userId,
        expiresAt,
      })
      .returning()

    return {
      success: true,
      invitation: {
        ...invitation,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
      },
    }
  })

export const getPackageMembersFn = createServerFn()
  .inputValidator(
    z.object({
      packageId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check access
    const access = await resolvePackageAccess(
      userId,
      data.packageId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this package.")
    }

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

    return members.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  })

export const getPackageInvitationsFn = createServerFn()
  .inputValidator(
    z.object({
      packageId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    // Check access
    const access = await resolvePackageAccess(
      userId,
      data.packageId,
      activeOrgId
    )
    if (access === "none") {
      throw new Error("You don't have access to this package.")
    }

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

// Invitation acceptance functions

export const acceptProjectInvitationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      invitationId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    if (!userId) {
      throw new Error("You must be logged in to accept invitations.")
    }

    // Get the invitation
    const [invitation] = await db
      .select({
        id: projectInvitation.id,
        projectId: projectInvitation.projectId,
        email: projectInvitation.email,
        role: projectInvitation.role,
        status: projectInvitation.status,
        expiresAt: projectInvitation.expiresAt,
      })
      .from(projectInvitation)
      .where(eq(projectInvitation.id, data.invitationId))
      .limit(1)

    if (!invitation) {
      throw new Error("Invitation not found.")
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been processed.")
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired.")
    }

    // Verify the user's email matches the invitation
    if (session.user.email !== invitation.email) {
      throw new Error("This invitation is for a different email address.")
    }

    // Get the project to find the organization
    const [project] = await db
      .select({ id: proj.id, organizationId: proj.organizationId })
      .from(proj)
      .where(eq(proj.id, invitation.projectId))
      .limit(1)

    if (!project) {
      throw new Error("Project not found.")
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, invitation.projectId),
          eq(projectMember.userId, userId)
        )
      )
      .limit(1)

    if (existingMember) {
      // Update invitation status and return
      await db
        .update(projectInvitation)
        .set({ status: "accepted" })
        .where(eq(projectInvitation.id, data.invitationId))
      return { success: true, message: "Already a member" }
    }

    // Add user as project member
    await db.insert(projectMember).values({
      projectId: invitation.projectId,
      userId,
      role: invitation.role,
    })

    // Ensure user is an org member
    await ensureOrgMembership(userId, project.organizationId)

    // Update invitation status
    await db
      .update(projectInvitation)
      .set({ status: "accepted" })
      .where(eq(projectInvitation.id, data.invitationId))

    return { success: true }
  })

export const acceptPackageInvitationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      invitationId: z.uuid(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    if (!userId) {
      throw new Error("You must be logged in to accept invitations.")
    }

    // Get the invitation
    const [invitation] = await db
      .select({
        id: packageInvitation.id,
        packageId: packageInvitation.packageId,
        email: packageInvitation.email,
        role: packageInvitation.role,
        status: packageInvitation.status,
        expiresAt: packageInvitation.expiresAt,
      })
      .from(packageInvitation)
      .where(eq(packageInvitation.id, data.invitationId))
      .limit(1)

    if (!invitation) {
      throw new Error("Invitation not found.")
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been processed.")
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired.")
    }

    // Verify the user's email matches the invitation
    if (session.user.email !== invitation.email) {
      throw new Error("This invitation is for a different email address.")
    }

    // Get the package to find the organization
    const [pkgRecord] = await db
      .select({ id: pkg.id, organizationId: pkg.organizationId })
      .from(pkg)
      .where(eq(pkg.id, invitation.packageId))
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(packageMember)
      .where(
        and(
          eq(packageMember.packageId, invitation.packageId),
          eq(packageMember.userId, userId)
        )
      )
      .limit(1)

    if (existingMember) {
      // Update invitation status and return
      await db
        .update(packageInvitation)
        .set({ status: "accepted" })
        .where(eq(packageInvitation.id, data.invitationId))
      return { success: true, message: "Already a member" }
    }

    // Add user as package member
    await db.insert(packageMember).values({
      packageId: invitation.packageId,
      userId,
      role: invitation.role,
    })

    // Ensure user is an org member
    await ensureOrgMembership(userId, pkgRecord.organizationId)

    // Update invitation status
    await db
      .update(packageInvitation)
      .set({ status: "accepted" })
      .where(eq(packageInvitation.id, data.invitationId))

    return { success: true }
  })
