import { createContext, useContext, useState, type ReactNode } from "react"

type SidebarContextType = {
  content: ReactNode
  setContent: (content: ReactNode) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)
  return (
    <SidebarContext.Provider value={{ content, setContent }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContent() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebarContent must be used within SidebarProvider")
  return ctx
}

