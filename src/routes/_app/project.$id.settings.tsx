import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/project/$id/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/project/$id/settings"!</div>
}
