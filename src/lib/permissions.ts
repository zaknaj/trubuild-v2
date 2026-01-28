import { db } from "@/db"
import { member, projectMember, packageMember, proj, pkg } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export type OrgRole = "owner" | "admin" | "member"
export type ProjectRole = "project_lead" | "commercial_lead" | "technical_lead"
export type PackageRole = "package_lead" | "commercial_team" | "technical_team"
export type AccessLevel = "full" | "commercial" | "technical" | "none"

/**
 * Get all user roles for a project
 */
export async function getProjectAccess(
  userId: string,
  projectId: string,
  organizationId: string
): Promise<{
  orgRole: OrgRole | null
  projectRole: ProjectRole | null
  packageRole: PackageRole | null
  isCreator: boolean
  access: AccessLevel
  hasProjectLevelAccess: boolean
}> {
  // First, get basic project info and project-level access
  const [projectResult] = await db
    .select({
      orgRole: member.role,
      projectRole: projectMember.role,
      creatorId: proj.userId,
    })
    .from(proj)
    .leftJoin(
      member,
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .leftJoin(
      projectMember,
      and(
        eq(projectMember.userId, userId),
        eq(projectMember.projectId, projectId)
      )
    )
    .where(eq(proj.id, projectId))
    .limit(1)

  if (!projectResult) {
    return {
      orgRole: null,
      projectRole: null,
      packageRole: null,
      isCreator: false,
      access: "none",
      hasProjectLevelAccess: false,
    }
  }

  const orgRole = projectResult.orgRole as OrgRole | null
  const projectRole = projectResult.projectRole as ProjectRole | null
  const isCreator = projectResult.creatorId === userId

  // Check if user has project-level access (not just via package)
  const hasProjectLevelAccess = orgRole === "owner" || isCreator || projectRole !== null

  // Check for package membership separately (check ALL packages in this project)
  const packageMemberships = await db
    .select({
      packageRole: packageMember.role,
    })
    .from(packageMember)
    .innerJoin(pkg, eq(packageMember.packageId, pkg.id))
    .where(
      and(
        eq(pkg.projectId, projectId),
        eq(packageMember.userId, userId)
      )
    )

  // Get the highest package role the user has
  // Priority: package_lead > commercial_team > technical_team
  let packageRole: PackageRole | null = null
  for (const pm of packageMemberships) {
    const role = pm.packageRole as PackageRole
    if (role === "package_lead") {
      packageRole = "package_lead"
      break // This is the highest, no need to continue
    } else if (role === "commercial_team") {
      if (packageRole !== "commercial_team") {
        packageRole = "commercial_team"
      }
    } else if (role === "technical_team") {
      if (packageRole === null) {
        packageRole = "technical_team"
      }
    }
  }

  // Determine access level - project-level access takes priority
  let access: AccessLevel = "none"

  if (orgRole === "owner" || isCreator || projectRole === "project_lead") {
    access = "full"
  } else if (projectRole === "commercial_lead") {
    access = "commercial"
  } else if (projectRole === "technical_lead") {
    access = "technical"
  } else if (packageRole === "package_lead") {
    // Package leads get full access to view the project (but not manage it)
    access = "full"
  } else if (packageRole === "commercial_team") {
    access = "commercial"
  } else if (packageRole === "technical_team") {
    access = "technical"
  }

  return { orgRole, projectRole, packageRole, isCreator, access, hasProjectLevelAccess }
}

/**
 * Get all user roles for a package in a single query
 */
export async function getPackageAccess(
  userId: string,
  packageId: string,
  organizationId: string
): Promise<{
  orgRole: OrgRole | null
  projectRole: ProjectRole | null
  packageRole: PackageRole | null
  isProjectCreator: boolean
  isPackageCreator: boolean
  access: AccessLevel
  projectId: string | null
}> {
  const [result] = await db
    .select({
      orgRole: member.role,
      projectRole: projectMember.role,
      packageRole: packageMember.role,
      projectCreatorId: proj.userId,
      projectId: pkg.projectId,
    })
    .from(pkg)
    .innerJoin(proj, eq(pkg.projectId, proj.id))
    .leftJoin(
      member,
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .leftJoin(
      projectMember,
      and(
        eq(projectMember.userId, userId),
        eq(projectMember.projectId, pkg.projectId)
      )
    )
    .leftJoin(
      packageMember,
      and(
        eq(packageMember.userId, userId),
        eq(packageMember.packageId, packageId)
      )
    )
    .where(eq(pkg.id, packageId))
    .limit(1)

  if (!result) {
    return {
      orgRole: null,
      projectRole: null,
      packageRole: null,
      isProjectCreator: false,
      isPackageCreator: false,
      access: "none",
      projectId: null,
    }
  }

  const orgRole = result.orgRole as OrgRole | null
  const projectRole = result.projectRole as ProjectRole | null
  const packageRole = result.packageRole as PackageRole | null
  const isProjectCreator = result.projectCreatorId === userId
  // Package creator is the same as project creator since packages inherit from projects
  const isPackageCreator = isProjectCreator
  const projectId = result.projectId

  // Determine access level (check package-level first, then project-level)
  let access: AccessLevel = "none"

  if (
    orgRole === "owner" ||
    isPackageCreator ||
    packageRole === "package_lead"
  ) {
    access = "full"
  } else if (packageRole === "commercial_team") {
    access = "commercial"
  } else if (packageRole === "technical_team") {
    access = "technical"
  } else if (isProjectCreator || projectRole === "project_lead") {
    access = "full"
  } else if (projectRole === "commercial_lead") {
    access = "commercial"
  } else if (projectRole === "technical_lead") {
    access = "technical"
  }

  return {
    orgRole,
    projectRole,
    packageRole,
    isProjectCreator,
    isPackageCreator,
    access,
    projectId,
  }
}
