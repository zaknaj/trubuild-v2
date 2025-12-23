import { db } from "@/db"
import { member, projectMember, packageMember, proj, pkg } from "@/db/schema"
import { and, eq, or } from "drizzle-orm"

export type OrgRole = "admin" | "project_owner" | "member"
export type ProjectRole = "project_lead" | "commercial_lead" | "technical_lead"
export type PackageRole = "package_lead" | "commercial_team" | "technical_team"

export type AccessLevel = "full" | "commercial" | "technical" | "none"

/**
 * Get user's organization role
 */
export async function getUserOrgRole(
  userId: string,
  organizationId: string
): Promise<OrgRole | null> {
  const [orgMember] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1)

  return (orgMember?.role as OrgRole) || null
}

/**
 * Get user's project role
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const [projMember] = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.userId, userId),
        eq(projectMember.projectId, projectId)
      )
    )
    .limit(1)

  return (projMember?.role as ProjectRole) || null
}

/**
 * Get user's package role
 */
export async function getUserPackageRole(
  userId: string,
  packageId: string
): Promise<PackageRole | null> {
  const [pkgMember] = await db
    .select({ role: packageMember.role })
    .from(packageMember)
    .where(
      and(
        eq(packageMember.userId, userId),
        eq(packageMember.packageId, packageId)
      )
    )
    .limit(1)

  return (pkgMember?.role as PackageRole) || null
}

/**
 * Check if user is project creator
 */
export async function isProjectCreator(
  userId: string,
  projectId: string
): Promise<boolean> {
  const [project] = await db
    .select({ userId: proj.userId })
    .from(proj)
    .where(eq(proj.id, projectId))
    .limit(1)

  return project?.userId === userId
}

/**
 * Check if user is package creator
 */
export async function isPackageCreator(
  userId: string,
  packageId: string
): Promise<boolean> {
  const [pkgRecord] = await db
    .select({ userId: pkg.userId })
    .from(pkg)
    .where(eq(pkg.id, packageId))
    .limit(1)

  return pkgRecord?.userId === userId
}

/**
 * Resolve user's access level to a project
 */
export async function resolveProjectAccess(
  userId: string,
  projectId: string,
  organizationId: string
): Promise<AccessLevel> {
  // Org admins have full access everywhere
  const orgRole = await getUserOrgRole(userId, organizationId)
  if (orgRole === "admin") {
    return "full"
  }

  // Check if user is project creator (default project lead)
  if (await isProjectCreator(userId, projectId)) {
    return "full"
  }

  // Check project membership
  const projectRole = await getUserProjectRole(userId, projectId)
  if (projectRole === "project_lead") {
    return "full"
  }
  if (projectRole === "commercial_lead") {
    return "commercial"
  }
  if (projectRole === "technical_lead") {
    return "technical"
  }

  // Org project owners can access projects they created or are invited to
  if (orgRole === "project_owner") {
    // Already checked creator above, so if they're here they're not creator
    // But they might have explicit project membership
    if (projectRole) {
      return projectRole === "project_lead"
        ? "full"
        : projectRole === "commercial_lead"
          ? "commercial"
          : "technical"
    }
  }

  // Org members only have access if explicitly invited
  if (orgRole === "member" && projectRole) {
    return projectRole === "project_lead"
      ? "full"
      : projectRole === "commercial_lead"
        ? "commercial"
        : "technical"
  }

  return "none"
}

/**
 * Resolve user's access level to a package
 */
export async function resolvePackageAccess(
  userId: string,
  packageId: string,
  organizationId: string
): Promise<AccessLevel> {
  // Org admins have full access everywhere
  const orgRole = await getUserOrgRole(userId, organizationId)
  if (orgRole === "admin") {
    return "full"
  }

  // Get package info to check project access
  const [pkgRecord] = await db
    .select({ projectId: pkg.projectId, userId: pkg.userId })
    .from(pkg)
    .where(eq(pkg.id, packageId))
    .limit(1)

  if (!pkgRecord) {
    return "none"
  }

  // Check if user is package creator (default package lead)
  if (pkgRecord.userId === userId) {
    return "full"
  }

  // Check package-level membership first
  const packageRole = await getUserPackageRole(userId, packageId)
  if (packageRole === "package_lead") {
    return "full"
  }
  if (packageRole === "commercial_team") {
    return "commercial"
  }
  if (packageRole === "technical_team") {
    return "technical"
  }

  // Check project-level membership (inherited access)
  const projectRole = await getUserProjectRole(userId, pkgRecord.projectId)
  if (projectRole === "project_lead") {
    return "full"
  }
  if (projectRole === "commercial_lead") {
    return "commercial"
  }
  if (projectRole === "technical_lead") {
    return "technical"
  }

  // Check if user is project creator
  if (await isProjectCreator(userId, pkgRecord.projectId)) {
    return "full"
  }

  // Org project owners can access packages in projects they created or are invited to
  if (orgRole === "project_owner") {
    if (projectRole) {
      return projectRole === "project_lead"
        ? "full"
        : projectRole === "commercial_lead"
          ? "commercial"
          : "technical"
    }
  }

  // Org members only have access if explicitly invited
  if (orgRole === "member" && (packageRole || projectRole)) {
    if (packageRole) {
      return packageRole === "package_lead"
        ? "full"
        : packageRole === "commercial_team"
          ? "commercial"
          : "technical"
    }
    if (projectRole) {
      return projectRole === "project_lead"
        ? "full"
        : projectRole === "commercial_lead"
          ? "commercial"
          : "technical"
    }
  }

  return "none"
}

/**
 * Check if user can invite to organization
 */
export async function canInviteToOrg(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const orgRole = await getUserOrgRole(userId, organizationId)
  return orgRole === "admin"
}

/**
 * Check if user can invite to project
 */
export async function canInviteToProject(
  userId: string,
  projectId: string,
  organizationId: string
): Promise<boolean> {
  // Org admins can invite anywhere
  const orgRole = await getUserOrgRole(userId, organizationId)
  if (orgRole === "admin") {
    return true
  }

  // Project leads can invite
  const projectRole = await getUserProjectRole(userId, projectId)
  if (projectRole === "project_lead") {
    return true
  }

  // Project creators are default project leads
  if (await isProjectCreator(userId, projectId)) {
    return true
  }

  return false
}

/**
 * Check if user can invite to package
 */
export async function canInviteToPackage(
  userId: string,
  packageId: string,
  organizationId: string
): Promise<boolean> {
  // Org admins can invite anywhere
  const orgRole = await getUserOrgRole(userId, organizationId)
  if (orgRole === "admin") {
    return true
  }

  // Package leads can invite
  const packageRole = await getUserPackageRole(userId, packageId)
  if (packageRole === "package_lead") {
    return true
  }

  // Package creators are default package leads
  if (await isPackageCreator(userId, packageId)) {
    return true
  }

  // Project leads can invite to packages in their project
  const [pkgRecord] = await db
    .select({ projectId: pkg.projectId })
    .from(pkg)
    .where(eq(pkg.id, packageId))
    .limit(1)

  if (pkgRecord) {
    const projectRole = await getUserProjectRole(userId, pkgRecord.projectId)
    if (projectRole === "project_lead") {
      return true
    }

    if (await isProjectCreator(userId, pkgRecord.projectId)) {
      return true
    }
  }

  return false
}

/**
 * Check if user has access to commercial section
 */
export async function hasCommercialAccess(
  userId: string,
  resourceId: string,
  resourceType: "project" | "package",
  organizationId: string
): Promise<boolean> {
  if (resourceType === "project") {
    const access = await resolveProjectAccess(
      userId,
      resourceId,
      organizationId
    )
    return access === "full" || access === "commercial"
  } else {
    const access = await resolvePackageAccess(
      userId,
      resourceId,
      organizationId
    )
    return access === "full" || access === "commercial"
  }
}

/**
 * Check if user has access to technical section
 */
export async function hasTechnicalAccess(
  userId: string,
  resourceId: string,
  resourceType: "project" | "package",
  organizationId: string
): Promise<boolean> {
  if (resourceType === "project") {
    const access = await resolveProjectAccess(
      userId,
      resourceId,
      organizationId
    )
    return access === "full" || access === "technical"
  } else {
    const access = await resolvePackageAccess(
      userId,
      resourceId,
      organizationId
    )
    return access === "full" || access === "technical"
  }
}
