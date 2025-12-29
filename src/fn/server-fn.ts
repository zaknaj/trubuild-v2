import { auth } from "@/auth/auth"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { ERRORS } from "@/lib/errors"
import { db } from "@/db"
import { member } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export type AuthContext = {
  userId: string
  activeOrgId: string
  userEmail: string
}

export type AuthContextNoOrg = {
  userId: string
  userEmail: string
  activeOrgId: string | null
}

/**
 * Get authenticated context
 * @param requireOrg - If true (default), requires an active organization
 */
export async function getAuthContext<T extends boolean = true>(
  requireOrg?: T
): Promise<T extends false ? AuthContextNoOrg : AuthContext> {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const userId = session?.user?.id
  const userEmail = session?.user?.email
  const activeOrgId = session?.session?.activeOrganizationId ?? null

  if (!userId || !userEmail) {
    throw new Error(ERRORS.MUST_BE_LOGGED_IN)
  }

  if (requireOrg !== false && !activeOrgId) {
    throw new Error(ERRORS.MUST_BE_LOGGED_IN_WITH_ORG)
  }

  return { userId, userEmail, activeOrgId } as T extends false
    ? AuthContextNoOrg
    : AuthContext
}

/**
 * Require org admin/owner role - throws if user lacks permission
 */
export async function requireOrgAdmin(ctx: AuthContext) {
  const [orgMember] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, ctx.userId), eq(member.organizationId, ctx.activeOrgId))
    )
    .limit(1)

  if (!orgMember || (orgMember.role !== "org-admin" && orgMember.role !== "owner")) {
    throw new Error(ERRORS.NO_PERMISSION_ADMIN)
  }
  return orgMember
}
