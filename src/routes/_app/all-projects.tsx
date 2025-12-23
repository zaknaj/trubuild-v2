import { Button } from "@/components/ui/button"
import { listProjectsFn } from "@/fn"
import {
  createFileRoute,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"

export const Route = createFileRoute("/_app/all-projects")({
  loader: async () => {
    const projects = await listProjectsFn()
    return { projects }
  },
  component: RouteComponent,
  staleTime: 0,
})

function RouteComponent() {
  const { projects } = Route.useLoaderData()
  const navigate = useNavigate()
  const location = useLocation()

  const formatDate = (value: string | null) => {
    if (!value) {
      return "—"
    }
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-[600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            All projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Projects in your active organization.
          </p>
        </div>
        <Button
          onClick={() => {
            navigate({
              to: location.pathname,
              search: (prev) => ({ ...prev, newProj: true }),
            })
          }}
        >
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted-foreground">
          You do not have any projects yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(project.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/project/$id",
                      params: { id: project.id },
                    })
                  }
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
