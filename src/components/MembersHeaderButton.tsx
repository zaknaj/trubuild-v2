import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface MemberInfo {
  userImage?: string | null
  userName?: string | null
  email: string
  userId?: string | null
}

interface MembersHeaderButtonProps {
  members: MemberInfo[]
  onClick: () => void
}

export function MembersHeaderButton({
  members,
  onClick,
}: MembersHeaderButtonProps) {
  const activeMembers = members.filter((m) => m.userId !== null)
  const count = activeMembers.length

  if (count === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="text-13 gap-1.5"
          >
            No members
          </Button>
        </TooltipTrigger>
        <TooltipContent>Members</TooltipContent>
      </Tooltip>
    )
  }

  if (count === 1) {
    const member = activeMembers[0]
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="text-13 gap-1.5 px-2"
          >
            {member.userImage ? (
              <img
                src={member.userImage}
                alt=""
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium uppercase text-muted-foreground">
                {member.userName?.charAt(0) || member.email.charAt(0)}
              </div>
            )}
            <span>{member.userName || member.email}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Members</TooltipContent>
      </Tooltip>
    )
  }

  // Multiple members - show up to 3 overlapping circles
  const displayMembers = activeMembers.slice(0, 3)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="text-13 gap-1.5 px-2"
        >
          <div className="flex items-center -space-x-1.5">
            {displayMembers.map((member, idx) => (
              <div
                key={member.email}
                className="relative"
                style={{ zIndex: 3 - idx }}
              >
                {member.userImage ? (
                  <img
                    src={member.userImage}
                    alt=""
                    className="size-5 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium uppercase text-muted-foreground ring-2 ring-background">
                    {member.userName?.charAt(0) || member.email.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <span>{count} members</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Members</TooltipContent>
    </Tooltip>
  )
}
