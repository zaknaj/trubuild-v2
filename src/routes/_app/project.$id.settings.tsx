import { createFileRoute } from "@tanstack/react-router"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/project/$id/settings")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageSidebar>
        <div className="font-medium">project-settings</div>
      </PageSidebar>
      <div>Hello "/_app/project/$id/settings"!</div>
    </>
  )
}
