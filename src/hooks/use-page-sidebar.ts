import { useEffect, type ReactNode } from "react"
import { useSidebarContent } from "@/components/SidebarContext"

export function usePageSidebar(content: ReactNode) {
  const { setContent } = useSidebarContent()

  useEffect(() => {
    setContent(content)
    return () => setContent(null)
  }, [content, setContent])
}

