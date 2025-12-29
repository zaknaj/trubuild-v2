import { db } from "@/db"
import { member, projectMember, packageMember, proj, pkg } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export type OrgRole = "org-admin" | "owner" | "member"
export type ProjectRole = "project_lead" | "commercial_lead" | "technical_lead"
export type PackageRole = "package_lead" | "commercial_team" | "technical_team"
export type AccessLevel = "full" | "commercial" | "technical" | "none"

/**
 * Get all user roles for a project in a single query
 */
export async function getProjectAccess(
  userId: string,
  projectId: string,
  organizationId: string
): Promise<{
  orgRole: OrgRole | null
  projectRole: ProjectRole | null
  isCreator: boolean
  access: AccessLevel
}> {
  const [result] = await db
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

  if (!result) {
    return {
      orgRole: null,
      projectRole: null,
      isCreator: false,
      access: "none",
    }
  }

  const orgRole = result.orgRole as OrgRole | null
  const projectRole = result.projectRole as ProjectRole | null
  const isCreator = result.creatorId === userId

  // Determine access level
  let access: AccessLevel = "none"

  if (orgRole === "org-admin" || isCreator || projectRole === "project_lead") {
    access = "full"
  } else if (projectRole === "commercial_lead") {
    access = "commercial"
  } else if (projectRole === "technical_lead") {
    access = "technical"
  }

  return { orgRole, projectRole, isCreator, access }
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
    orgRole === "org-admin" ||
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
