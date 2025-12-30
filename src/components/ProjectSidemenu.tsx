import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Settings, Plus, Package as PackageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sidemenu } from "@/components/Sidemenu"
import { MemberDisplay } from "@/components/MemberDisplay"
import { createPackageFn } from "@/fn"
import {
  projectDetailQueryOptions,
  projectAccessQueryOptions,
  projectMembersQueryOptions,
} from "@/lib/query-options"
import type { Package, Member } from "@/lib/types"

export function ProjectSidemenu({ projectId }: { projectId: string }) {
  const { data: projectData } = useSuspenseQuery(projectDetailQueryOptions(projectId))
  const { data: accessData } = useSuspenseQuery(projectAccessQueryOptions(projectId))
  const { data: members } = useSuspenseQuery(projectMembersQueryOptions(projectId))
  const queryClient = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [packageName, setPackageName] = useState("")

  const { project, packages } = projectData
  const canCreatePackage = accessData.access === "full"

  const leadMembers = members.filter((m: Member) => m.role === "project_lead")
  const otherMembers = members.filter(
    (m: Member) => m.role === "commercial_lead" || m.role === "technical_lead"
  )

  const createPackage = useMutation({
    mutationFn: (name: string) =>
      createPackageFn({ data: { projectId: project.id, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryOptions(project.id).queryKey,
      })
      closeDrawer()
    },
  })

  const closeDrawer = () => {
    setDrawerOpen(false)
    setPackageName("")
    createPackage.reset()
  }

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault()
    const name = packageName.trim()
    if (!name) return
    createPackage.mutate(name)
  }

  return (
    <>
      <Sidemenu>
        <div className="p-4 space-y-6">
          {/* Back link */}
          <Link
            to="/all-projects"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            All Projects
          </Link>

          {/* Project header */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {project.name}
            </h2>
            <Link
              to="/project/$id/settings"
              params={{ id: projectId }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
            >
              <Settings className="size-4" />
            </Link>
          </div>

          {/* Lead members */}
          <MemberDisplay
            members={leadMembers}
            href={`/project/${projectId}/settings`}
            label="Lead"
          />

          {/* Other members */}
          <MemberDisplay
            members={otherMembers}
            href={`/project/${projectId}/settings`}
            label="Members"
          />

          {/* Packages */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Packages
            </p>
            <div className="space-y-1">
              {packages.map((pkg: Package) => (
                <Link
                  key={pkg.id}
                  to="/package/$id"
                  params={{ id: pkg.id }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm hover:bg-slate-100 transition-colors"
                >
                  <PackageIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{pkg.name}</span>
                </Link>
              ))}
              {canCreatePackage && (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors w-full"
                >
                  <Plus className="size-4" />
                  <span>New package</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Sidemenu>

      <Drawer open={drawerOpen} direction="right" onClose={closeDrawer}>
        <DrawerContent className="min-w-[500px]">
          <form className="space-y-6" onSubmit={handleCreatePackage}>
            <DrawerHeader>
              <DrawerTitle>Create package</DrawerTitle>
              <DrawerDescription>
                Packages live inside your project and gather related assets.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-2">
              <Label htmlFor="package-name">Package name</Label>
              <Input
                id="package-name"
                placeholder="Landing pages"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                disabled={createPackage.isPending}
                autoFocus
              />
              {createPackage.error ? (
                <p className="text-sm text-red-500">
                  {createPackage.error instanceof Error
                    ? createPackage.error.message
                    : "Unable to create package."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick something descriptive so your teammates know what this
                  package holds.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={createPackage.isPending || !packageName.trim()}
              >
                {createPackage.isPending ? "Creating..." : "Create package"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}

