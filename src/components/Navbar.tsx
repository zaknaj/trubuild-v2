import { Link } from "@tanstack/react-router"

import { OrgNavButton } from "./OrgNavButton"
import { AccountNavButton } from "./AccountNavButton"
import { Columns3, LayoutDashboard, Settings } from "lucide-react"

export const Navbar = () => {
  return (
    <div className="h-14 shrink-0 flex items-center px-3 text-white justify-between">
      <div className="flex-1 flex gap-3 items-center">
        <img src="/logo-app.svg" alt="logo" className="w-7 h-7" />
        <div className="w-[1.5px] h-4 opacity-20 bg-white"></div>
        <OrgNavButton />
      </div>
      <div className="w-fit flex items-center gap-3 justify-center">
        <Link
          to="/"
          className="rounded py-1.5 text-shadow-sm font-medium flex items-center gap-1 px-2.5 border-[0.5px] border-transparent hover:bg-black/10 text-white/60"
          activeProps={{
            className:
              "text-white/100 bg-white/20 ring ring-white/40 opacity-100 hover:bg-white/20",
          }}
        >
          <LayoutDashboard size="16" /> Overview
        </Link>
        <Link
          to="/all-projects"
          className="rounded py-1.5 text-shadow-sm font-medium flex items-center gap-1 px-2.5 border-[0.5px] border-transparent hover:bg-black/10 text-white/60"
          activeProps={{
            className:
              "text-white/100 bg-white/20 ring ring-white/40 opacity-100 hover:bg-white/20",
          }}
        >
          <Columns3 size="16" />
          All projects
        </Link>
        <Link
          to="/settings"
          className="rounded py-1.5 text-shadow-sm font-medium flex items-center gap-1 px-2.5 border-[0.5px] border-transparent hover:bg-black/10 text-white/60"
          activeProps={{
            className:
              "text-white/100 bg-white/20 ring ring-white/40 opacity-100 hover:bg-white/20",
          }}
        >
          <Settings size="16" /> Settings
        </Link>
      </div>
      <div className="flex-1 flex justify-end">
        <AccountNavButton />
      </div>
    </div>
  )
}
