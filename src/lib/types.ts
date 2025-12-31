import type {
  listProjectsFn,
  getProjectMembersFn,
  getOrgMembersFn,
  getPackageWithAssetsFn,
  getPackageMembersFn,
  getOrgPendingInvitesFn,
} from "@/fn"

// Inferred from server function return types - stays in sync automatically
export type Project = Awaited<ReturnType<typeof listProjectsFn>>[number]
export type Member = Awaited<ReturnType<typeof getProjectMembersFn>>[number]
export type OrgMember = Awaited<ReturnType<typeof getOrgMembersFn>>[number]
export type OrgPendingInvite = Awaited<
  ReturnType<typeof getOrgPendingInvitesFn>
>[number]
export type PackageMember = Awaited<
  ReturnType<typeof getPackageMembersFn>
>[number]
export type PackageDetail = Awaited<ReturnType<typeof getPackageWithAssetsFn>>
export type Package = PackageDetail["package"]
export type Asset = PackageDetail["assets"][number]

