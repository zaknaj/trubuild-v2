import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: async () => {
    console.log("Settings loader")
    return {
      message: "Settings",
    }
  },
})

function RouteComponent() {
  return (
    <div>
      <h1>Settings</h1>
      <Link to="/">go to index</Link>
    </div>
  )
}
