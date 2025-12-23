import { Button } from "@/components/ui/button"

import {
  createFileRoute,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="p-5">
      <Button
        onClick={() => {
          navigate({
            to: location.pathname,
            search: (prev) => ({ ...prev, newProj: true }),
          })
        }}
      >
        Create Project
      </Button>
    </div>
  )
}
