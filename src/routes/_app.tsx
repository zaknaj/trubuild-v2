import { createProjectFn, setActiveOrgFn, setOrgCreatorAsAdminFn } from "@/fn"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useState, useEffect } from "react"
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
import type { RouterContext } from "@/router"
import {
  activeOrgIdQueryOptions,
  orgsQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options"

export const Route = createFileRoute("/_app")({
  loader: async ({ context }) => {
    const { queryClient } = context as RouterContext
    // Session check must await for auth redirect
    const session = await queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: "/login" })
    }
    // Fire and forget - data will be ready by the time component needs it
    void queryClient.ensureQueryData(orgsQueryOptions)
    void queryClient.ensureQueryData(activeOrgIdQueryOptions)
  },
  component: RouteComponent,
})

type DrawerType = "createOrg" | "createProject" | null

function RouteComponent() {
  const { data: activeOrg } = useQuery(activeOrgIdQueryOptions)
  const { data: orgs = [] } = useQuery(orgsQueryOptions)
  const queryClient = useQueryClient()

  const [drawer, setDrawer] = useState<DrawerType>(null)

  // Auto-set first org as active if needed
  useEffect(() => {
    if (orgs.length > 0 && !activeOrg) {
      setActiveOrgFn({ data: { organizationId: orgs[0].id } }).then(() => {
        queryClient.setQueryData(activeOrgIdQueryOptions.queryKey, orgs[0].id)
      })
    }
  }, [orgs, activeOrg, queryClient])

  // Show create org drawer if no orgs
  useEffect(() => {
    if (orgs.length === 0) {
      setDrawer("createOrg")
    }
  }, [orgs.length])

  // Project form state
  const [projectName, setProjectName] = useState("")
  const [projectError, setProjectError] = useState<string | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // Org form state
  const [orgName, setOrgName] = useState("")
  const [orgError, setOrgError] = useState<string | null>(null)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  const closeDrawer = () => {
    setDrawer(null)
    setProjectName("")
    setProjectError(null)
    setOrgName("")
    setOrgError(null)
  }

  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = projectName.trim()
    if (!name) {
      setProjectError("Project name is required")
      return
    }

    setIsCreatingProject(true)
    setProjectError(null)
    try {
      await createProjectFn({ data: { name } })
      closeDrawer()
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Unable to create project.")
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleCreateOrg = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = orgName.trim()
    if (!name) {
      setOrgError("Organization name is required")
      return
    }

    setIsCreatingOrg(true)
    setOrgError(null)
    try {
      const result = await authClient.organization.create({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      })
      if (result?.data?.id) {
        try {
          await setOrgCreatorAsAdminFn({ data: { organizationId: result.data.id } })
        } catch {
          // Continue anyway
        }
      }
      closeDrawer()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: activeOrgIdQueryOptions.queryKey }),
      ])
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : "Unable to create organization.")
    } finally {
      setIsCreatingOrg(false)
    }
  }

  return (
    <div className="w-full h-screen main-bg-gradient flex flex-col text-sm">
      <Navbar onCreateOrg={() => setDrawer("createOrg")} />
      <div className="size-full [--p:24px] [--r:12px] [--d:6px] p-(--p) pt-0 flex-1 relative">
        <div
          className="absolute bg-white/20 -top-(--d) left-[calc(var(--p)-var(--d))] h-[calc(100%-var(--p)+var(--d)*2)] 
          w-[calc(100%-(var(--p)-var(--d))*2)] rounded-[calc(var(--r)+var(--d))] border-[0.5px] border-white/30 [box-shadow:0_0_20px_rgba(0,0,0,0.25)]"
        />
        <div className="relative bg-white rounded-(--r) size-full">
          <Outlet />
        </div>
      </div>

      <Drawer open={drawer === "createOrg"} direction="right" onClose={closeDrawer}>
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
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isCreatingOrg}
                autoFocus
              />
              {orgError ? (
                <p className="text-sm text-red-500">{orgError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Organizations help you organize and manage your projects.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={isCreatingOrg || !orgName.trim()}>
                {isCreatingOrg ? "Creating..." : "Create organization"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer open={drawer === "createProject"} direction="right" onClose={closeDrawer}>
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
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isCreatingProject || !activeOrg}
                autoFocus
              />
              {projectError ? (
                <p className="text-sm text-red-500">{projectError}</p>
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
                disabled={isCreatingProject || !projectName.trim() || !activeOrg}
              >
                {isCreatingProject ? "Creating..." : "Create project"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
