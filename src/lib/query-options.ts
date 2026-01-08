import { queryOptions } from "@tanstack/react-query"
import {
  getAuthBootstrapFn,
  getCurrentUserOrgRoleFn,
  getOrgMembersFn,
  getOrgPendingInvitesFn,
  getOrgsFn,
  getPackageAccessFn,
  getPackageMembersFn,
  getPackageWithAssetsFn,
  getProjectAccessFn,
  getProjectMembersFn,
  getProjectWithPackagesFn,
  getSessionFn,
  listProjectsFn,
  listArchivedProjectsFn,
  listArchivedPackagesFn,
} from "@/fn"

// ============================================================================
// Query Keys Factory
// ============================================================================

export const queryKeys = {
  session: () => ["session"] as const,
  orgs: () => ["organizations"] as const,
  projects: () => ["projects"] as const,
  archivedProjects: () => ["archived-projects"] as const,
  archivedPackages: () => ["archived-packages"] as const,
  project: {
    detail: (id: string) => ["project", id, "detail"] as const,
    members: (id: string) => ["project", id, "members"] as const,
    access: (id: string) => ["project", id, "access"] as const,
  },
  package: {
    detail: (id: string) => ["package", id, "detail"] as const,
    members: (id: string) => ["package", id, "members"] as const,
    access: (id: string) => ["package", id, "access"] as const,
  },
  org: {
    members: () => ["org", "members"] as const,
    pendingInvites: () => ["org", "pending-invites"] as const,
    currentUserRole: () => ["org", "current-user-role"] as const,
  },
} as const

// ============================================================================
// Session & Auth
// ============================================================================

export const authBootstrapQueryOptions = queryOptions({
  queryKey: ["auth", "bootstrap"] as const,
  queryFn: () => getAuthBootstrapFn(),
  staleTime: 2 * 60 * 1000, // 2 min - small but used often for guards
})

export const sessionQueryOptions = queryOptions({
  queryKey: queryKeys.session(),
  queryFn: () => getSessionFn(),
  staleTime: 5 * 60 * 1000, // 5 min - auth data
})

export const orgsQueryOptions = queryOptions({
  queryKey: queryKeys.orgs(),
  queryFn: () => getOrgsFn(),
  staleTime: 2 * 60 * 1000, // 2 min - rarely changes
})

// ============================================================================
// Organization
// ============================================================================

export const projectsQueryOptions = queryOptions({
  queryKey: queryKeys.projects(),
  queryFn: () => listProjectsFn(),
  staleTime: 30 * 1000, // 30s - structure doesn't change often
})

export const archivedProjectsQueryOptions = queryOptions({
  queryKey: queryKeys.archivedProjects(),
  queryFn: () => listArchivedProjectsFn(),
  staleTime: 30 * 1000, // 30s
})

export const archivedPackagesQueryOptions = queryOptions({
  queryKey: queryKeys.archivedPackages(),
  queryFn: () => listArchivedPackagesFn(),
  staleTime: 30 * 1000, // 30s
})

export const orgMembersQueryOptions = queryOptions({
  queryKey: queryKeys.org.members(),
  queryFn: () => getOrgMembersFn(),
  staleTime: 30 * 1000, // 30s
})

export const orgPendingInvitesQueryOptions = queryOptions({
  queryKey: queryKeys.org.pendingInvites(),
  queryFn: () => getOrgPendingInvitesFn(),
  staleTime: 30 * 1000, // 30s
})

export const currentUserOrgRoleQueryOptions = queryOptions({
  queryKey: queryKeys.org.currentUserRole(),
  queryFn: () => getCurrentUserOrgRoleFn(),
  staleTime: 30 * 1000, // 30s
})

// ============================================================================
// Project
// ============================================================================

export const projectDetailQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: queryKeys.project.detail(projectId),
    queryFn: () => getProjectWithPackagesFn({ data: { projectId } }),
    staleTime: 30 * 1000, // 30s
  })

export const projectMembersQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: queryKeys.project.members(projectId),
    queryFn: () => getProjectMembersFn({ data: { projectId } }),
    staleTime: 30 * 1000, // 30s
  })

export const projectAccessQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: queryKeys.project.access(projectId),
    queryFn: () => getProjectAccessFn({ data: { projectId } }),
    staleTime: 30 * 1000, // 30s
  })

// ============================================================================
// Package
// ============================================================================

export const packageDetailQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: queryKeys.package.detail(packageId),
    queryFn: () => getPackageWithAssetsFn({ data: { packageId } }),
    staleTime: 30 * 1000, // 30s
  })

export const packageMembersQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: queryKeys.package.members(packageId),
    queryFn: () => getPackageMembersFn({ data: { packageId } }),
    staleTime: 30 * 1000, // 30s
  })

export const packageAccessQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: queryKeys.package.access(packageId),
    queryFn: () => getPackageAccessFn({ data: { packageId } }),
    staleTime: 30 * 1000, // 30s
  })
