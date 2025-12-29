import type { ReactNode } from "react"

export function PageSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 h-full z-10 pointer-events-none sidebar rounded-xl rounded-l-none">
      {children}
    </div>
  )
}
