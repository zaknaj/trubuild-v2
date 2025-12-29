import { createFileRoute, redirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useState } from "react"
import { getSession, linkPendingMembershipsFn } from "@/fn"
import { authClient } from "@/auth/auth-client"
import { Field } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const redirectIfAuthed = createMiddleware().server(async ({ next }) => {
  const session = await getSession()
  if (session) throw redirect({ to: "/" })
  return next()
})

const DEFAULT_PASSWORD = "dev-password-123"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  server: { middleware: [redirectIfAuthed] },
})

function LoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const credentials = { email, password: DEFAULT_PASSWORD }

    // Try sign in first
    const signIn = await authClient.signIn.email(credentials)
    if (signIn.data) {
      await linkPendingMembershipsFn()
      window.location.href = "/"
      return
    }

    // Fall back to sign up
    const signUp = await authClient.signUp.email({
      ...credentials,
      name: email.split("@")[0],
    })
    if (signUp.data) {
      await linkPendingMembershipsFn()
      window.location.href = "/"
      return
    }

    setError("Login failed")
    setIsLoading(false)
  }

  return (
    <div className="pt-25 flex flex-col items-center justify-center gap-20">
      <div className="flex flex-col items-center justify-center gap-3">
        <img src="/logo-app.svg" alt="Logo" className="w-16 h-16" />
        <h1 className="text-lg font-semibold text-white">
          Welcome to TruBuild
        </h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mx-auto space-y-3 bg-white p-12 pt-10 modal-with-border flex flex-col items-center justify-center"
      >
        <div className="text-base font-semibold mb-8">
          Please login to continue
        </div>
        <Input
          type="email"
          placeholder="name@company.com"
          autoFocus
          className="bg-white w-70 text-center py-4"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
        />
        <Button
          type="submit"
          className="w-70 py-4"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? <Spinner /> : "Log in"}
        </Button>
        {/* {error && <p className="text-red-600 text-sm">{error}</p>} */}
      </form>
    </div>
  )
}
