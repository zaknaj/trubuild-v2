import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/test-route')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/test-route"!</div>
}
