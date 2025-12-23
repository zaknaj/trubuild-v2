import { auth } from "@/auth/auth"
import { db } from "@/db"
import { proj } from "@/db/schema"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"

export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  return session
})

export const getOrgsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const orgs = await auth.api.listOrganizations({ headers })
  return orgs
})

export const getActiveOrgFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  return session?.session?.activeOrganizationId ?? null
})

export const setActiveOrgFn = createServerFn()
  .inputValidator(z.object({ organizationId: z.string() }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    auth.api.setActiveOrganization({
      headers,
      body: { organizationId: data.organizationId },
    })
  })

export const listProjectsFn = createServerFn().handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  const activeOrgId = session?.session?.activeOrganizationId
  if (!session?.user || !activeOrgId) {
    return []
  }

  const projects = await db
    .select()
    .from(proj)
    .where(eq(proj.organizationId, activeOrgId))
    .orderBy(desc(proj.createdAt))

  return projects.map((project) => ({
    ...project,
    createdAt: project.createdAt?.toISOString() ?? null,
    updatedAt: project.updatedAt?.toISOString() ?? null,
  }))
})

export const createProjectFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1, "Project name is required"),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    const userId = session?.user?.id
    const activeOrgId = session?.session?.activeOrganizationId
    if (!userId || !activeOrgId) {
      throw new Error(
        "Select an active organization before creating a project."
      )
    }

    const [project] = await db
      .insert(proj)
      .values({
        name: data.name,
        userId,
        organizationId: activeOrgId,
      })
      .returning()

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
    }
  })
