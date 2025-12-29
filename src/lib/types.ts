import type {
  listProjectsFn,
  getProjectMembersFn,
  getPackageWithAssetsFn,
} from "@/fn"

// Inferred from server function return types - stays in sync automatically
export type Project = Awaited<ReturnType<typeof listProjectsFn>>[number]
export type Member = Awaited<ReturnType<typeof getProjectMembersFn>>[number]
export type PackageDetail = Awaited<ReturnType<typeof getPackageWithAssetsFn>>
export type Package = PackageDetail["package"]
export type Asset = PackageDetail["assets"][number]

