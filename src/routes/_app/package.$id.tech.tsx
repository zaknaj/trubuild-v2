import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/package/$id/tech")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div>Hello "/_app/package/$id/tech"!</div>
    </>
  )
}
