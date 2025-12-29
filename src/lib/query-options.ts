import { queryOptions } from "@tanstack/react-query"
import {
  getActiveOrgFn,
  getOrgMembersFn,
  getOrgPendingInvitesFn,
  getOrgsFn,
  getPackageAccessFn,
  getPackageMembersFn,
  getPackageWithAssetsFn,
  getProjectAccessFn,
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
  queryFn: listProjectsFn,
})

export const orgMembersQueryOptions = queryOptions({
  queryKey: ["org", "members"],
  queryFn: getOrgMembersFn,
})

export const orgPendingInvitesQueryOptions = queryOptions({
  queryKey: ["org", "pending-invites"],
  queryFn: getOrgPendingInvitesFn,
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

export const projectAccessQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId, "access"],
    queryFn: () => getProjectAccessFn({ data: { projectId } }),
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

export const packageAccessQueryOptions = (packageId: string) =>
  queryOptions({
    queryKey: ["package", packageId, "access"],
    queryFn: () => getPackageAccessFn({ data: { packageId } }),
  })
