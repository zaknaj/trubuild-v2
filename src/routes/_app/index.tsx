import { Button } from "@/components/ui/button"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  return (
    <div className="p-5">
      <Button onClick={() => navigate({ to: "/all-projects" })}>
        View Projects
      </Button>
    </div>
  )
}
