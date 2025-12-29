import { createFileRoute } from "@tanstack/react-router"
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute("/_app/package/$id/comm/$assetId")({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">asset</div>)

  return (
    <div className="p-6 max-w-[600px] mx-auto">
      Hello "/_app/package/$id/comm/$assetId"!
    </div>
  )
}
