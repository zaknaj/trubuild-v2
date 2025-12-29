import { createFileRoute } from '@tanstack/react-router'
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute('/_app/package/$id/tech')({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">package-tech</div>)

  return <div>Hello "/_app/package/$id/tech"!</div>
}
