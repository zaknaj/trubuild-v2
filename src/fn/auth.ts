import { auth } from "@/auth/auth"
import { db } from "@/db"
import {
  pkg,
  proj,
  member,
  projectMember,
  packageMember,
  invitation,
} from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { getAuthContext, requireOrgOwner } from "../auth/auth-guards"

// ============================================================================
// Session & Organization
// ============================================================================

export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  return auth.api.getSession({ headers })
})

// Naming consistency: prefer *Fn suffix for exported server functions
export const getSessionFn = getSession

export type AuthBootstrap = {
  session: Awaited<ReturnType<typeof auth.api.getSession>>
  orgs: Awaited<ReturnType<typeof auth.api.listOrganizations>>
}

async function getAuthBootstrap(headers: Headers): Promise<AuthBootstrap> {
  const session = await auth.api.getSession({ headers })
  if (!session) return { session: null, orgs: [] }
  const orgs = await auth.api.listOrganizations({ headers })
  return { session, orgs }
}

/** Fetch auth-related bootstrap data (session + orgs) in one call */
export const getAuthBootstrapFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  return getAuthBootstrap(headers)
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
  // Accept pending organization invitations
  const pendingInvitations = await db
    .select({
      id: invitation.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    })
    .from(invitation)
    .where(and(eq(invitation.email, email), eq(invitation.status, "pending")))

  for (const inv of pendingInvitations) {
    // Add user as member to the organization
    await db
      .insert(member)
      .values({
        id: globalThis.crypto.randomUUID(),
        userId,
        organizationId: inv.organizationId,
        role: inv.role ?? "member",
        createdAt: new Date(),
      })
      .onConflictDoNothing()

    // Mark invitation as accepted
    await db
      .update(invitation)
      .set({ status: "accepted" })
      .where(eq(invitation.id, inv.id))
  }

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
  return (await getAuthBootstrap(headers)).orgs
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

// Naming fix: this sets org creator role to "owner"
export const setOrgCreatorAsOwnerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await getAuthContext(false)
    await db
      .update(member)
      .set({ role: "owner" })
      .where(
        and(
          eq(member.userId, ctx.userId),
          eq(member.organizationId, data.organizationId)
        )
      )
    return { success: true }
  })

// Backwards-compat alias (can remove later)
export const setOrgCreatorAsAdminFn = setOrgCreatorAsOwnerFn

export const updateOrganizationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).optional(),
      logo: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await requireOrgOwner(ctx)
    const headers = getRequestHeaders()

    const updateData: { name?: string; logo?: string } = {}
    if (data.name) updateData.name = data.name
    if (data.logo) updateData.logo = data.logo

    if (Object.keys(updateData).length === 0) {
      return { success: true }
    }

    await auth.api.updateOrganization({
      headers,
      body: {
        organizationId: ctx.activeOrgId,
        data: updateData,
      },
    })

    return { success: true }
  })

export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).optional(),
      image: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()

    const updateData: { name?: string; image?: string } = {}
    if (data.name) updateData.name = data.name
    if (data.image) updateData.image = data.image

    if (Object.keys(updateData).length === 0) {
      return { success: true }
    }

    await auth.api.updateUser({
      headers,
      body: updateData,
    })

    return { success: true }
  })
