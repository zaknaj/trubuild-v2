import { auth } from "@/auth/auth"
import { getRequestHeaders } from "@tanstack/react-start/server"

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
 * Get authenticated context requiring an active organization
 */
export async function getAuthContext(): Promise<AuthContext> {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const userId = session?.user?.id
  const activeOrgId = session?.session?.activeOrganizationId
  const userEmail = session?.user?.email

  if (!userId || !activeOrgId || !userEmail) {
    throw new Error("You must be logged in with an active organization.")
  }

  return { userId, activeOrgId, userEmail }
}

/**
 * Get authenticated context (no org required)
 */
export async function getAuthContextNoOrg(): Promise<AuthContextNoOrg> {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const userId = session?.user?.id
  const userEmail = session?.user?.email
  const activeOrgId = session?.session?.activeOrganizationId ?? null

  if (!userId || !userEmail) {
    throw new Error("You must be logged in.")
  }

  return { userId, userEmail, activeOrgId }
}

/**
 * Serialize dates for JSON transport
 */
export const serializeDates = <
  T extends {
    createdAt: Date | null | undefined
    updatedAt?: Date | null | undefined
  },
>(
  record: T
) => ({
  ...record,
  createdAt: record.createdAt?.toISOString() ?? null,
  updatedAt: record.updatedAt?.toISOString() ?? null,
})
