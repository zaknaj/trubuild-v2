import { createFileRoute } from '@tanstack/react-router'
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute('/_app/package/$id/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">package-settings</div>)

  return <div>Hello "/_app/package/$id/settings"!</div>
}
