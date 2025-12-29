import { buttonVariants } from "@/components/ui/button"
import { PageSidebar } from "@/components/PageSidebar"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageSidebar>
        <div className="font-medium">home</div>
      </PageSidebar>
      <div className="p-5">
        <Link to="/all-projects" className={buttonVariants()}>
          View Projects
        </Link>
      </div>
    </>
  )
}
