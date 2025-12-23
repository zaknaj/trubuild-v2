import {
  createProjectFn,
  getActiveOrgFn,
  getOrgsFn,
  getSession,
  setActiveOrgFn,
  setOrgCreatorAsAdminFn,
} from "@/fn"
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { z } from "zod"
import { FormEvent, useEffect, useState } from "react"
import { Navbar } from "@/components/Navbar"
import {
  Drawer,
  DrawerFooter,
  DrawerDescription,
  DrawerTitle,
  DrawerHeader,
  DrawerContent,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/auth/auth-client"

export const Route = createFileRoute("/_app")({
  loaderDeps: ({ search }) => ({
    createOrg: search.createOrg,
    newProj: search.newProj,
  }),
  loader: async ({ deps: { createOrg } }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/login" })
    }
    const orgs = await getOrgsFn()
    let activeOrg = await getActiveOrgFn()

    if (orgs.length === 0 && !createOrg) {
      throw redirect({ to: "/", search: { createOrg: true } })
    }

    if (orgs.length > 0 && !activeOrg) {
      await setActiveOrgFn({ data: { organizationId: orgs[0].id } })
      activeOrg = orgs[0].id
    }
    return {
      ...session,
      orgs,
      activeOrg,
    }
  },
  component: RouteComponent,
  validateSearch: z.object({
    createOrg: z.boolean().optional(),
    newProj: z.boolean().optional(),
  }),
  staleTime: Infinity,
})

function RouteComponent() {
  const { createOrg, newProj } = Route.useSearch()
  const { activeOrg } = Route.useLoaderData()

  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()
  const [projectName, setProjectName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedProjectName = projectName.trim()

  const [orgName, setOrgName] = useState("")
  const [createOrgError, setCreateOrgError] = useState<string | null>(null)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const trimmedOrgName = orgName.trim()

  useEffect(() => {
    if (!newProj) {
      setProjectName("")
      setCreateError(null)
      setIsSubmitting(false)
    }
  }, [newProj])

  useEffect(() => {
    if (!createOrg) {
      setOrgName("")
      setCreateOrgError(null)
      setIsCreatingOrg(false)
    }
  }, [createOrg])

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedProjectName) {
      setCreateError("Project name is required")
      return
    }

    setIsSubmitting(true)
    setCreateError(null)
    try {
      await createProjectFn({ data: { name: trimmedProjectName } })
      navigate({
        to: location.pathname,
        search: (prev) => ({ ...prev, newProj: false }),
      })
    } catch (error) {
      console.error(error)
      setCreateError(
        error instanceof Error ? error.message : "Unable to create project."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateOrg = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedOrgName) {
      setCreateOrgError("Organization name is required")
      return
    }

    setIsCreatingOrg(true)
    setCreateOrgError(null)
    try {
      const result = await authClient.organization.create({
        name: trimmedOrgName,
        slug: trimmedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      })
      // Set the creator as admin
      if (result?.data?.id) {
        try {
          await setOrgCreatorAsAdminFn({
            data: { organizationId: result.data.id },
          })
        } catch (adminError) {
          console.error("Failed to set admin role:", adminError)
          // Continue anyway - organization was created successfully
        }
      }
      navigate({
        to: location.pathname,
        search: (prev) => ({ ...prev, createOrg: false }),
      })
      // Invalidate the route to reload organizations
      await router.invalidate()
    } catch (error) {
      console.error(error)
      setCreateOrgError(
        error instanceof Error
          ? error.message
          : "Unable to create organization."
      )
    } finally {
      setIsCreatingOrg(false)
    }
  }

  return (
    <div className="w-full h-screen main-bg-gradient flex flex-col text-sm">
      <Navbar />
      <div className="size-full [--p:24px] [--r:12px] [--d:6px] p-(--p) pt-0 flex-1 relative">
        <div
          className="absolute bg-white/20 -top-(--d) left-[calc(var(--p)-var(--d))] h-[calc(100%-var(--p)+var(--d)*2)] 
          w-[calc(100%-(var(--p)-var(--d))*2)] rounded-[calc(var(--r)+var(--d))] border-[0.5px] border-white/30 [box-shadow:0_0_20px_rgba(0,0,0,0.25)]"
        ></div>
        <div className="relative bg-white rounded-(--r) size-full">
          <Outlet />
        </div>
      </div>

      {/* {createOrg && <CreateOrgModal />} */}

      <Drawer
        open={createOrg}
        direction="right"
        onClose={() => {
          navigate({
            to: location.pathname,
            search: (prev) => ({ ...prev, createOrg: false }),
          })
        }}
      >
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreateOrg}>
            <DrawerHeader>
              <DrawerTitle>Create Organization</DrawerTitle>
              <DrawerDescription>
                Create a new organization to manage your projects.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                disabled={isCreatingOrg}
                autoFocus
              />
              {createOrgError ? (
                <p className="text-sm text-red-500">{createOrgError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Organizations help you organize and manage your projects.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={isCreatingOrg || !trimmedOrgName}>
                {isCreatingOrg ? "Creating..." : "Create organization"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={newProj}
        direction="right"
        onClose={() => {
          navigate({
            to: location.pathname,
            search: (prev) => ({ ...prev, newProj: false }),
          })
        }}
      >
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreateProject}>
            <DrawerHeader>
              <DrawerTitle>Create Project</DrawerTitle>
              <DrawerDescription>
                Create a new project for your organization.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="Project Nova"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                disabled={isSubmitting || !activeOrg}
                autoFocus
              />
              {createError ? (
                <p className="text-sm text-red-500">{createError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Projects are created inside your active organization.
                </p>
              )}
              {!activeOrg && (
                <p className="text-xs text-amber-600">
                  Select an active organization to create projects.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={isSubmitting || !trimmedProjectName || !activeOrg}
              >
                {isSubmitting ? "Creating..." : "Create project"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
