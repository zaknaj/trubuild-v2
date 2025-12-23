import { authClient } from "@/auth/auth-client"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useState } from "react"
import { getSession } from "@/fn"

const redirectIfAuthed = createMiddleware().server(async ({ next }) => {
  const session = await getSession()
  if (session) {
    throw redirect({ to: "/" })
  }
  return await next()
})

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  server: {
    middleware: [redirectIfAuthed],
  },
})

function RouteComponent() {
  const [email, setEmail] = useState("zak@zak.com")
  const [password, setPassword] = useState("zak123456")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Try to sign in first
      const signInResult = await authClient.signIn.email({
        email,
        password,
      })

      if (signInResult.data) {
        navigate({ to: "/" })
        return
      }

      // If sign in failed, check if it's because user doesn't exist
      const errorMessage = signInResult.error?.message?.toLowerCase() || ""
      const isUserNotFound =
        errorMessage.includes("user not found") ||
        errorMessage.includes("invalid credentials") ||
        errorMessage.includes("invalid email or password")

      if (isUserNotFound) {
        // Try to sign up instead
        const signUpResult = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        })

        if (signUpResult.data) {
          navigate({ to: "/" })
          return
        } else if (signUpResult.error) {
          setError(signUpResult.error.message || "Sign up failed")
        }
      } else {
        setError(signInResult.error?.message || "Sign in failed")
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "An error occurred"
      setError(errorMessage)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-[600px] p-10 m-10 mx-auto">
      <input
        className="border p-2 rounded w-full mb-2"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 rounded w-full mb-2"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
    </div>
  )
}
