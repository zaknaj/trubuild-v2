import { createFileRoute } from "@tanstack/react-router"
import { PageSidebar } from "@/components/PageSidebar"

export const Route = createFileRoute("/_app/package/$id/comm/$assetId")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageSidebar>
        <div className="font-medium">asset</div>
      </PageSidebar>
      <div className="p-6 max-w-[600px] mx-auto">
        Hello "/_app/package/$id/comm/$assetId"!
      </div>
    </>
  )
}
