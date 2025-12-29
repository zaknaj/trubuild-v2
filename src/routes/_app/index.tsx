import { buttonVariants } from "@/components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import { usePageSidebar } from "@/hooks/use-page-sidebar"

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
})

function RouteComponent() {
  usePageSidebar(<div className="font-medium">home</div>)

  return (
    <div className="p-5">
      <Link to="/all-projects" className={buttonVariants()}>
        View Projects
      </Link>
    </div>
  )
}
