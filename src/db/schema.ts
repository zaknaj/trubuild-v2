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

export const projectMember = pgTable(
  "project_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => proj.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .$type<"project_lead" | "commercial_lead" | "technical_lead">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_member_projectId_idx").on(table.projectId),
    index("project_member_userId_idx").on(table.userId),
  ]
)

export const packageMember = pgTable(
  "package_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => pkg.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .$type<"package_lead" | "commercial_team" | "technical_team">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("package_member_packageId_idx").on(table.packageId),
    index("package_member_userId_idx").on(table.userId),
  ]
)

export const projectInvitation = pgTable(
  "project_invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => proj.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role")
      .notNull()
      .$type<"project_lead" | "commercial_lead" | "technical_lead">(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("project_invitation_projectId_idx").on(table.projectId),
    index("project_invitation_email_idx").on(table.email),
  ]
)

export const packageInvitation = pgTable(
  "package_invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => pkg.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role")
      .notNull()
      .$type<"package_lead" | "commercial_team" | "technical_team">(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("package_invitation_packageId_idx").on(table.packageId),
    index("package_invitation_email_idx").on(table.email),
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
  invitations: many(projectInvitation),
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
  members: many(packageMember),
  invitations: many(packageInvitation),
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

export const projectInvitationRelations = relations(
  projectInvitation,
  ({ one }) => ({
    project: one(proj, {
      fields: [projectInvitation.projectId],
      references: [proj.id],
    }),
    inviter: one(user, {
      fields: [projectInvitation.inviterId],
      references: [user.id],
    }),
  })
)

export const packageInvitationRelations = relations(
  packageInvitation,
  ({ one }) => ({
    package: one(pkg, {
      fields: [packageInvitation.packageId],
      references: [pkg.id],
    }),
    inviter: one(user, {
      fields: [packageInvitation.inviterId],
      references: [user.id],
    }),
  })
)
