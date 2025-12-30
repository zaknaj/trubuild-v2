import { Link } from "@tanstack/react-router"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar"
import type { Member } from "@/lib/types"

interface MemberDisplayProps {
  members: Member[]
  href: string
  label: string
}

export function MemberDisplay({ members, href, label }: MemberDisplayProps) {
  const displayMembers = members.slice(0, 3)
  const isSingle = members.length === 1
  const singleMember = members[0]

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <Link
        to={href}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-slate-100 transition-colors"
      >
        {members.length === 0 ? (
          <span className="text-sm text-muted-foreground">No member</span>
        ) : isSingle ? (
          <>
            <Avatar size="sm">
              {singleMember.userImage ? (
                <AvatarImage src={singleMember.userImage} alt="" />
              ) : null}
              <AvatarFallback>
                {(singleMember.userName ?? singleMember.email)
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">
              {singleMember.userName ?? singleMember.email}
            </span>
          </>
        ) : (
          <>
            <AvatarGroup>
              {displayMembers.map((member) => (
                <Avatar key={member.id} size="sm">
                  {member.userImage ? (
                    <AvatarImage src={member.userImage} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {(member.userName ?? member.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <span className="text-sm text-muted-foreground">
              {members.length} members
            </span>
          </>
        )}
      </Link>
    </div>
  )
}

