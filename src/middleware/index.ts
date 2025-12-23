import { redirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { getSession } from "@/fn"
// import { auth } from "@/auth/auth"

export const authRedirect = createMiddleware().server(async ({ next }) => {
  const session = await getSession()

  if (!session) {
    throw redirect({ to: "/login" })
  }

  // const organizations = await auth.api.listOrganizations({ headers: request.headers })

  // if (organizations.length === 0) {
  //   throw redirect({ to: "/new-org" })
  // }

  return await next({
    context: {
      ...session,
    },
  })
})
