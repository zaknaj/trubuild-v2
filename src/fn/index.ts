import { auth } from "@/auth/auth"
import { db } from "@/db"
import { asset, pkg, proj, member, user, invitation } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"

const serializeDates = <
  T extends { createdAt: Date | null | undefined; updatedAt: Date | null | undefined },
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

export const listProjectsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

  const projects = await db
    .select()
    .from(proj)
    .where(eq(proj.organizationId, activeOrgId))
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

    return serializeDates(project)
  })

export const getProjectWithPackagesFn = createServerFn()
  .inputValidator(
    z.object({
      projectId: z.string().uuid("Invalid project id"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const activeOrgId = session?.session?.activeOrganizationId
    if (!session?.user || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    const [project] = await db
      .select()
      .from(proj)
      .where(and(eq(proj.id, data.projectId), eq(proj.organizationId, activeOrgId)))
      .limit(1)

    if (!project) {
      throw new Error("Project not found.")
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
      projectId: z.string().uuid("Invalid project id"),
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

    const [project] = await db
      .select({ id: proj.id })
      .from(proj)
      .where(and(eq(proj.id, data.projectId), eq(proj.organizationId, activeOrgId)))
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

    return serializeDates(newPackage)
  })

export const getPackageWithAssetsFn = createServerFn()
  .inputValidator(
    z.object({
      packageId: z.string().uuid("Invalid package id"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const activeOrgId = session?.session?.activeOrganizationId
    if (!session?.user || !activeOrgId) {
      throw new Error("You must select an active organization.")
    }

    const [pkgRecord] = await db
      .select()
      .from(pkg)
      .where(and(eq(pkg.id, data.packageId), eq(pkg.organizationId, activeOrgId)))
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
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
      packageId: z.string().uuid("Invalid package id"),
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
      .where(and(eq(pkg.id, data.packageId), eq(pkg.organizationId, activeOrgId)))
      .limit(1)

    if (!pkgRecord) {
      throw new Error("Package not found.")
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
