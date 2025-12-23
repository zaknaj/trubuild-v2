import { queryOptions } from "@tanstack/react-query"
import {
  getActiveOrgFn,
  getAllPackageInvitationsFn,
  getAllProjectInvitationsFn,
  getInvitationsFn,
  getOrgMembersFn,
  getOrgsFn,
  getPackageInvitationsFn,
  getPackageMembersFn,
  getPackageWithAssetsFn,
  getProjectInvitationsFn,
  getProjectMembersFn,
  getProjectWithPackagesFn,
  getSession,
  listProjectsFn,
} from "@/fn"

// Session & Auth
export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: getSession,
  staleTime: 5 * 60 * 1000,
})

export const orgsQueryOptions = queryOptions({
  queryKey: ["organizations"],
  queryFn: getOrgsFn,
  staleTime: 60 * 1000,
})

export const activeOrgIdQueryOptions = queryOptions({
  queryKey: ["active-organization-id"],
  queryFn: getActiveOrgFn,
})

// Organization
export const projectsQueryOptions = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjectsFn({ data: {} }),
})

export const orgMembersQueryOptions = queryOptions({
  queryKey: ["org", "members"],
  queryFn: () => getOrgMembersFn({ data: {} }),
})

export const orgInvitationsQueryOptions = queryOptions({
  queryKey: ["org", "invitations"],
  queryFn: () => getInvitationsFn({ data: {} }),
})

export const orgProjectInvitationsQueryOptions = queryOptions({
  queryKey: ["org", "project-invitations"],
  queryFn: () => getAllProjectInvitationsFn({ data: {} }),
})

export const orgPackageInvitationsQueryOptions = queryOptions({
  queryKey: ["org", "package-invitations"],
  queryFn: () => getAllPackageInvitationsFn({ data: {} }),
})

// Project
export const projectDetailQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId, "detail"],
    queryFn: () => getProjectWithPackagesFn({ data: { projectId } }),
  })

export const projectMembersQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId, "members"],
    queryFn: () => getProjectMembersFn({ data: { projectId } }),
  })

export const projectInvitationsQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId, "invitations"],
    queryFn: () => getProjectInvitationsFn({ data: { projectId } }),
  })

// Package
export const packageDetailQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: ["package", packageId, "detail"],
    queryFn: () => getPackageWithAssetsFn({ data: { packageId } }),
  })

export const packageMembersQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: ["package", packageId, "members"],
    queryFn: () => getPackageMembersFn({ data: { packageId } }),
  })

export const packageInvitationsQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: ["package", packageId, "invitations"],
    queryFn: () => getPackageInvitationsFn({ data: { packageId } }),
  })
