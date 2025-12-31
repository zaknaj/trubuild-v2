import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useState, useEffect } from "react"
import {
  getAuthBootstrapFn,
  getOrgsFn,
  linkPendingMembershipsFn,
} from "@/fn"
import { authClient } from "@/auth/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { CreateOrgForm } from "@/components/CreateOrgForm"

const redirectIfAuthedWithOrg = createMiddleware().server(async ({ next }) => {
  const { session, orgs } = await getAuthBootstrapFn()
  if (session && orgs.length > 0) throw redirect({ to: "/" })
  return next()
})

const DEFAULT_PASSWORD = "dev-password-123"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  server: { middleware: [redirectIfAuthedWithOrg] },
  loader: async () => {
    const { session, orgs } = await getAuthBootstrapFn()
    return {
      needsOrg: !!session && orgs.length === 0,
      isLoggedIn: !!session,
    }
  },
})

type LoginState = "login" | "create-org"

function LoginPage() {
  const { needsOrg, isLoggedIn } = Route.useLoaderData()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loginState, setLoginState] = useState<LoginState>("login")

  useEffect(() => {
    // Keep UI in sync with auth state from the loader.
    // This prevents the create-org view from "sticking" after a logout.
    if (!isLoggedIn) setLoginState("login")
    else if (needsOrg) setLoginState("create-org")
    else setLoginState("login")
  }, [needsOrg, isLoggedIn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const credentials = { email, password: DEFAULT_PASSWORD }

    const signIn = await authClient.signIn.email(credentials)
    if (signIn.data) {
      await linkPendingMembershipsFn()
      const orgs = await getOrgsFn()
      if (orgs.length === 0) {
        setLoginState("create-org")
        setIsLoading(false)
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
      // Re-check if user now has orgs (from accepted invitations)
      const orgs = await getOrgsFn()
      if (orgs.length === 0) {
        setLoginState("create-org")
        setIsLoading(false)
        return
      }
      navigate({ to: "/" })
      return
    }

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
      <div className="bg-white p-8 py-6 rounded-xl flex flex-col gap-6 w-80 modal-shadow">
        {loginState === "login" ? (
          <>
            <h2 className="font-semibold text-center">
              Please log in to continue
            </h2>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center"
            >
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
                className="w-full mt-3"
              >
                {isLoading ? <Spinner /> : "Log in"}
              </Button>
            </form>
          </>
        ) : (
          <CreateOrgForm onSuccess={() => navigate({ to: "/" })} />
        )}
      </div>
    </div>
  )
}
