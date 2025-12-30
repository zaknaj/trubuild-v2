import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/package/$id/comm/$assetId")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div className="p-6 max-w-[600px] mx-auto">
        Hello "/_app/package/$id/comm/$assetId"!
      </div>
    </>
  )
}
