import { authClient } from "@/auth/auth-client"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/login")({
  component: RouteComponent,
})

import { useState } from "react"

function RouteComponent() {
  const [email, setEmail] = useState("zak@zak.com")
  const [password, setPassword] = useState("zak123456")
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  return (
    <div className="max-w-[600px] p-10 m-10 mx-auto ring">
      <input className="border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={async () => {
            setError(null)
            try {
              const result = await authClient.signUp.email({
                email,
                password,
                name: email.split("@")[0],
              })
              if (result.data) {
                navigate({ to: "/" })
              } else if (result.error) {
                setError(result.error.message || "Sign up failed")
              }
            } catch (err: any) {
              const errorMessage = err?.message || err?.toString() || "An error occurred during sign up"
              setError(errorMessage)
              console.error(err)
            }
          }}
        >
          Sign Up
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            setError(null)
            try {
              const result = await authClient.signIn.email({
                email,
                password,
              })
              if (result.data) {
                navigate({ to: "/" })
              } else if (result.error) {
                setError(result.error.message || "Sign in failed")
              }
            } catch (err: any) {
              const errorMessage = err?.message || err?.toString() || "An error occurred during sign in"
              setError(errorMessage)
              console.error(err)
            }
          }}
        >
          Sign In
        </button>
      </div>
      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
    </div>
  )
}
