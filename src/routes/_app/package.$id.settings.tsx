import { createFileRoute } from "@tanstack/react-router"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/package/$id/settings")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageSidebar>
        <div className="font-medium">package-settings</div>
      </PageSidebar>
      <div>Hello "/_app/package/$id/settings"!</div>
    </>
  )
}
