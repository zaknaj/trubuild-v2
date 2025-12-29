export const ERRORS = {
  NOT_FOUND: (resource: string) => `${resource} not found.`,
  NO_ACCESS: (resource: string) => `You don't have access to this ${resource}.`,
  NO_PERMISSION_INVITE: (resource: string) =>
    `You don't have permission to add members to this ${resource}.`,
  NO_PERMISSION_REMOVE: (resource: string) =>
    `You don't have permission to remove members from this ${resource}.`,
  NO_PERMISSION_ADMIN: "You don't have permission to perform this action.",
  MUST_BE_LOGGED_IN: "You must be logged in.",
  MUST_BE_LOGGED_IN_WITH_ORG: "You must be logged in with an active organization.",
} as const

