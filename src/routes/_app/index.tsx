import { buttonVariants } from "@/components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-5">
      <Link to="/all-projects" className={buttonVariants()}>
        View Projects
      </Link>
    </div>
  )
}
