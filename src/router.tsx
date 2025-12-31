import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { createRouter } from "@tanstack/react-router"
import { toast } from "sonner"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Create a new router instance
export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        console.error("[Query Error]", error)
        toast.error(error.message || "Something went wrong")
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error("[Mutation Error]", error)
        toast.error(error.message || "Something went wrong")
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultErrorComponent: ({ error }) => (
      <div className="p-6 text-center">
        <p className="text-red-500 font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    ),
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
