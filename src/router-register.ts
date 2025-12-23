import type { QueryClient } from "@tanstack/react-query"
import type { getRouter } from "./router"

declare module "@tanstack/router-core" {
  interface Register {
    router: ReturnType<typeof getRouter>
    context: {
      queryClient: QueryClient
    }
  }
}
