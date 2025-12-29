import { createFileRoute } from '@tanstack/react-router'
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute('/_app/project/$id/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">project-settings</div>)

  return <div>Hello "/_app/project/$id/settings"!</div>
}
