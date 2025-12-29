import { createFileRoute } from "@tanstack/react-router"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/package/$id/comm")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageSidebar>
        <div className="font-medium">package-comm</div>
      </PageSidebar>
      <div>Hello "/_app/package/$id/comm"!</div>
    </>
  )
}
