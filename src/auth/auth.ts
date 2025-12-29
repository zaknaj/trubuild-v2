import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { organization } from "better-auth/plugins"
import { admin } from "better-auth/plugins"

import { db } from "@/db"
import * as schema from "@/db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-assign admin role to @trubuild.io users
          if (user.email.endsWith("@trubuild.io")) {
            return { data: { ...user, role: "admin" } }
          }
          return { data: user }
        },
      },
    },
  },
  plugins: [organization(), admin(), tanstackStartCookies()], // tanstackStartCookies always last!
})
