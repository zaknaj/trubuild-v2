import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/project/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/project/$id"!</div>
}
