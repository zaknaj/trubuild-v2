import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { useState } from "react"
import {
  getAuthBootstrapFn,
  getOrgsFn,
  linkPendingMembershipsFn,
  setActiveOrgFn,
} from "@/fn"
import { authClient } from "@/auth/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

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
      // Set the first org as active if user has orgs
      await setActiveOrgFn({ data: { organizationId: orgs[0].id } })
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
      // Set the first org as active if user has orgs
      await setActiveOrgFn({ data: { organizationId: orgs[0].id } })
      navigate({ to: "/" })
      return
    }

    setIsLoading(false)
  }

  return (
    <div className="flex h-screen  flex-col items-center justify-between main-gradient text-white">
      <div className="flex gap-3 h-40 items-center flex-col justify-end">
        <img src="/logo-white.png" alt="Logo" className="w-15 h-15" />
        <h1 className="text-2xl font-medium">TruBuild</h1>
      </div>
      <div className="flex flex-col gap-6 w-70 pb-20">
        <h2 className="font-medium text-center text-lg">Sign in to continue</h2>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <Input
            type="email"
            placeholder="name@company.com"
            autoFocus
            className="text-white placeholder:text-white/40 border-white/30 border-[0.5px] outline-red-500 bg-white/20 w-full text-center
              
              focus-visible:border-white/50 focus-visible:ring-white/20
              "
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
            className="w-full px-3 mt-3"
          >
            {isLoading ? <Spinner /> : "Sign in"}
          </Button>
        </form>
      </div>
      <div className="text-12 text-white/50 h-40 flex items-end justify-center pb-10">
        Copyright © 2026 TruBuild. All rights reserved.
      </div>
    </div>
  )
}
