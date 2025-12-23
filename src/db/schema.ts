export * from "@/auth/auth-schema"
import { relations } from "drizzle-orm"
import { pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core"
import { user, organization } from "@/auth/auth-schema"

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("pkg_projectId_idx").on(table.projectId),
    index("pkg_userId_idx").on(table.userId),
    index("pkg_organizationId_idx").on(table.organizationId),
  ]
)

export const asset = pgTable(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => pkg.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("asset_packageId_idx").on(table.packageId),
    index("asset_userId_idx").on(table.userId),
    index("asset_organizationId_idx").on(table.organizationId),
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
}))

export const pkgRelations = relations(pkg, ({ one, many }) => ({
  proj: one(proj, {
    fields: [pkg.projectId],
    references: [proj.id],
  }),
  user: one(user, {
    fields: [pkg.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [pkg.organizationId],
    references: [organization.id],
  }),
  assets: many(asset),
}))

export const assetRelations = relations(asset, ({ one }) => ({
  pkg: one(pkg, {
    fields: [asset.packageId],
    references: [pkg.id],
  }),
  user: one(user, {
    fields: [asset.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [asset.organizationId],
    references: [organization.id],
  }),
}))
