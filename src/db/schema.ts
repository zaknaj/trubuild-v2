export * from "@/auth/auth-schema"
import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core"
import { user, organization } from "@/auth/auth-schema"

/**
 * ID Type Strategy:
 *
 * - Auth tables (user, organization, member, invitation, session, account, verification)
 *   use `text` IDs because better-auth requires text-based identifiers.
 *
 * - App tables (proj, pkg, asset, projectMember, packageMember, projectInvitation, packageInvitation)
 *   use `uuid` IDs for better type safety and database performance.
 *
 * Foreign keys reference the appropriate ID type based on the referenced table.
 */

// Common timestamp pattern
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}

export const proj = pgTable(
  "proj",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    archivedAt: timestamp("archived_at"),
    ...timestamps,
  },
  (table) => [
    index("proj_userId_idx").on(table.userId),
    index("proj_organizationId_idx").on(table.organizationId),
  ]
)

export const pkg = pgTable(
  "pkg",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => proj.id, { onDelete: "cascade" }),
    archivedAt: timestamp("archived_at"),
    ...timestamps,
  },
  (table) => [index("pkg_projectId_idx").on(table.projectId)]
)

export const asset = pgTable(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => pkg.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("asset_packageId_idx").on(table.packageId)]
)

export const projectMember = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => proj.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // nullable for pending members
    email: text("email").notNull(),
    role: text("role")
      .notNull()
      .$type<"project_lead" | "commercial_lead" | "technical_lead">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.email] }),
    index("project_member_userId_idx").on(table.userId),
  ]
)

export const packageMember = pgTable(
  "package_member",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => pkg.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // nullable for pending members
    email: text("email").notNull(),
    role: text("role")
      .notNull()
      .$type<"package_lead" | "commercial_team" | "technical_team">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.packageId, table.email] }),
    index("package_member_userId_idx").on(table.userId),
  ]
)

export const projRelations = relations(proj, ({ one, many }) => ({
  user: one(user, {
    fields: [proj.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [proj.organizationId],
    references: [organization.id],
  }),
  pkgs: many(pkg),
  members: many(projectMember),
}))

export const pkgRelations = relations(pkg, ({ one, many }) => ({
  proj: one(proj, {
    fields: [pkg.projectId],
    references: [proj.id],
  }),
  assets: many(asset),
  members: many(packageMember),
}))

export const assetRelations = relations(asset, ({ one }) => ({
  pkg: one(pkg, {
    fields: [asset.packageId],
    references: [pkg.id],
  }),
}))

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(proj, {
    fields: [projectMember.projectId],
    references: [proj.id],
  }),
  user: one(user, {
    fields: [projectMember.userId],
    references: [user.id],
  }),
}))

export const packageMemberRelations = relations(packageMember, ({ one }) => ({
  package: one(pkg, {
    fields: [packageMember.packageId],
    references: [pkg.id],
  }),
  user: one(user, {
    fields: [packageMember.userId],
    references: [user.id],
  }),
}))
