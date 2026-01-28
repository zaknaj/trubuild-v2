import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar"
import { Button } from "./ui/button"

interface MemberDisplayProps {
  members: {
    id: string
    name: string
    email: string
    image: string
  }[]
  onClick?: () => void
}

export function MemberDisplay({ members, onClick }: MemberDisplayProps) {
  const displayMembers = members.slice(0, 3)
  const isSingle = members.length === 1
  const singleMember = members[0]

  const content = (
    <>
      {members.length === 0 ? (
        <span className="text-12 text-muted-foreground">No member</span>
      ) : isSingle ? (
        <>
          <Avatar size="sm">
            {singleMember.image ? (
              <AvatarImage src={singleMember.image} alt="" />
            ) : null}
            <AvatarFallback>
              {(singleMember.name ?? singleMember.email)
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-12 font-medium truncate">
            {singleMember.name ?? singleMember.email}
          </span>
        </>
      ) : (
        <>
          <AvatarGroup>
            {displayMembers.map((member) => (
              <Avatar key={member.id} size="sm">
                {member.image ? (
                  <AvatarImage src={member.image} alt="" />
                ) : null}
                <AvatarFallback>
                  {(member.name ?? member.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <span className="text-12 text-muted-foreground">
            {members.length} members
          </span>
        </>
      )}
    </>
  )

  return (
    <Button variant="ghost" onClick={onClick}>
      {content}
    </Button>
  )
}
