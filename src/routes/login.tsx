import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useState } from "react"
import { getAuthBootstrapFn, getOrgsFn, linkPendingMembershipsFn } from "@/fn"
import { authClient } from "@/auth/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { LoginBackground } from "@/components/ProgressiveBackground"

const redirectIfAuthed = createMiddleware().server(async ({ next }) => {
  const { session, orgs } = await getAuthBootstrapFn()
  if (session && orgs.length > 0) throw redirect({ to: "/" })
  if (session && orgs.length === 0) throw redirect({ to: "/create-org" })
  return next()
})

const DEFAULT_PASSWORD = "dev-password-123"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  server: { middleware: [redirectIfAuthed] },
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const credentials = { email, password: DEFAULT_PASSWORD }

    const signIn = await authClient.signIn.email(credentials)
    if (signIn.data) {
      await linkPendingMembershipsFn()
      const orgs = await getOrgsFn()
      if (orgs.length === 0) {
        navigate({ to: "/create-org" })
        return
      }
      navigate({ to: "/" })
      return
    }

    const signUp = await authClient.signUp.email({
      ...credentials,
      name: email.split("@")[0],
    })
    if (signUp.data) {
      await linkPendingMembershipsFn()
      const orgs = await getOrgsFn()
      if (orgs.length === 0) {
        navigate({ to: "/create-org" })
        return
      }
      navigate({ to: "/" })
      return
    }

    setIsLoading(false)
  }

  return (
    <div className="flex h-screen">
      <div className="flex-3 flex flex-col items-center justify-center gap-20 pb-40 min-w-150 shrink-0">
        <div className="flex flex-col items-center justify-center gap-3">
          <img src="/logo-black.png" alt="Logo" className="w-16 h-16" />
          <h1 className="text-2xl font-medium">TruBuild</h1>
        </div>
        <div className="flex flex-col gap-6 w-70">
          <h2 className="font-medium text-center text-lg">
            Sign in to continue
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <Input
              type="email"
              placeholder="name@company.com"
              autoFocus
              className="bg-white w-full text-center"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !email.trim()}
              className="w-fit rounded-full px-3 mt-3 h-8.5"
            >
              {isLoading ? <Spinner /> : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      <LoginBackground className="flex-4" />
    </div>
  )
}
