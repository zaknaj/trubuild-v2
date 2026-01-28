import { useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { Settings, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MembersHeaderButton,
  type MemberInfo,
} from "@/components/MembersHeaderButton"
import { AIChatButton } from "@/components/AIChatButton"

interface PackageHeaderProps {
  packageId: string
  title: string
  onTitleChange?: (newTitle: string) => void
  onSettingsClick?: () => void
  onActivityClick?: () => void
  members?: MemberInfo[]
  onMembersClick?: () => void
  canViewTechnical?: boolean
  canViewCommercial?: boolean
}

export function PackageHeader({
  packageId,
  title,
  onTitleChange,
  onSettingsClick,
  onActivityClick,
  members,
  onMembersClick,
  canViewTechnical = true,
  canViewCommercial = true,
}: PackageHeaderProps) {
  const editRef = useRef<HTMLSpanElement>(null)
  const pendingValueRef = useRef<string | null>(null)

  // Clear pending value when title updates to match it
  useEffect(() => {
    if (pendingValueRef.current === title) {
      pendingValueRef.current = null
    }
  }, [title])

  const handleClick = () => {
    if (onTitleChange && editRef.current) {
      editRef.current.contentEditable = "true"
      editRef.current.focus()
      // Select all text
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  const handleBlur = () => {
    if (!editRef.current) return
    editRef.current.contentEditable = "false"
    const trimmed = (editRef.current.textContent || "").trim()
    if (trimmed && trimmed !== title && onTitleChange) {
      pendingValueRef.current = trimmed
      editRef.current.textContent = trimmed
      onTitleChange(trimmed)
    } else {
      editRef.current.textContent = title
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      editRef.current?.blur()
    } else if (e.key === "Escape") {
      if (editRef.current) {
        editRef.current.textContent = title
        editRef.current.contentEditable = "false"
        editRef.current.blur()
      }
    }
  }

  const displayValue = pendingValueRef.current ?? title

  return (
    <div className="flex items-center justify-between border-b-[0.5px] border-black/15 h-12 pl-7 pr-2">
      <div className="flex items-center">
        <div className="w-[280px]">
          <span
            ref={editRef}
            onClick={handleClick}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`text-16 font-semibold max-w-full w-fit truncate ${onTitleChange ? "cursor-text hover:bg-muted/50 rounded px-1 -ml-1 focus:outline-1 focus:outline-primary focus:bg-muted/50" : ""}`}
            suppressContentEditableWarning
          >
            {displayValue}
          </span>
        </div>

        <nav className="flex items-center h-12">
          <HeaderNavLink to="/package/$id" params={{ id: packageId }} exact>
            Summary
          </HeaderNavLink>
          {canViewTechnical && (
            <HeaderNavLink to="/package/$id/tech" params={{ id: packageId }}>
              Technical evaluation
            </HeaderNavLink>
          )}
          {canViewCommercial && (
            <HeaderNavLink to="/package/$id/comm" params={{ id: packageId }}>
              Commercial evaluation
            </HeaderNavLink>
          )}
          <HeaderNavLink
            to="/package/$id/contractors"
            params={{ id: packageId }}
          >
            Contractors
          </HeaderNavLink>
        </nav>
      </div>

      <div className="flex items-center gap-1">
        {onSettingsClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="gap-1.5 text-13"
              >
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        )}
        {onActivityClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onActivityClick}
                className="gap-1.5 text-13"
              >
                <Activity className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activity</TooltipContent>
          </Tooltip>
        )}
        {members && onMembersClick && (
          <MembersHeaderButton members={members} onClick={onMembersClick} />
        )}
        <AIChatButton />
      </div>
    </div>
  )
}

function HeaderNavLink({
  to,
  params,
  exact,
  children,
}: {
  to: string
  params: Record<string, string>
  exact?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={exact ? { exact: true } : undefined}
      className="h-full flex items-center mx-3.5 text-13 font-medium text-foreground/50 hover:text-foreground transition-colors border-b-2 border-transparent data-[status=active]:text-primary data-[status=active]:border-primary"
    >
      {children}
    </Link>
  )
}
