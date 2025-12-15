import { authClient } from "@/auth/auth-client"
import { authMiddleware } from "@/auth/auth-middleware"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: App,
  server: {
    middleware: [authMiddleware],
  },
})

function App() {
  const { data: user } = authClient.useSession()

  const navigate = useNavigate()
  return (
    <div className="flex flex-col w-[800px] mx-auto p-10 ring">
      <h1 className="text-2xl font-bold">Hello {user?.user.email}</h1>
      <button
        className="border rounded px-2 py-1 my-1 bg-black text-white"
        onClick={async () => {
          await authClient.signOut().then(({ error }) => {
            if (error) {
              console.error(error)
            }
          })
          navigate({ to: "/login" })
        }}
      >
        Logout
      </button>
    </div>
  )
}
