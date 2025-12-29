import { createFileRoute } from '@tanstack/react-router'
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute('/_app/package/$id/comm')({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">package-comm</div>)

  return <div>Hello "/_app/package/$id/comm"!</div>
}
