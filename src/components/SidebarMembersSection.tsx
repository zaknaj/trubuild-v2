import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Member {
  email: string
  userId: string | null
  userName: string | null
  userImage: string | null
  role: string
}

interface MembersSectionProps {
  members: Member[]
  type: "project" | "package"
  canEdit: boolean
  onManageClick: () => void
  currentUserId?: string
}

const PROJECT_ROLE_CONFIG = {
  project_lead: { label: "Project Leads", order: 1 },
  commercial_lead: { label: "Commercial Leads", order: 2 },
  technical_lead: { label: "Technical Leads", order: 3 },
} as const

const PACKAGE_ROLE_CONFIG = {
  package_lead: { label: "Package Leads", order: 1 },
  commercial_team: { label: "Commercial Members", order: 2 },
  technical_team: { label: "Technical Members", order: 3 },
} as const

function MemberAvatar({ member }: { member: Member }) {
  if (member.userImage) {
    return (
      <img
        src={member.userImage}
        alt=""
        className="size-6 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground">
      {member.userName?.charAt(0) || member.email.charAt(0)}
    </div>
  )
}

function MemberRow({
  member,
  isCurrentUser,
}: {
  member: Member
  isCurrentUser: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <MemberAvatar member={member} />
      <p className="text-sm truncate">{member.userName || member.email}</p>
      {isCurrentUser && (
        <Badge
          variant="secondary"
          className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100"
        >
          You
        </Badge>
      )}
    </div>
  )
}

function RoleSection({
  label,
  members,
  currentUserId,
}: {
  label: string
  members: Member[]
  currentUserId?: string
}) {
  if (members.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {members.map((member) => (
          <MemberRow
            key={member.email}
            member={member}
            isCurrentUser={!!currentUserId && member.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

export function SidebarMembersSection({
  members,
  type,
  canEdit,
  onManageClick,
  currentUserId,
}: MembersSectionProps) {
  const activeMembers = members.filter((m) => m.userId !== null)
  const totalCount = activeMembers.length

  // Don't show the section at all if there are no members
  if (totalCount === 0 && !canEdit) return null

  const roleConfig =
    type === "project" ? PROJECT_ROLE_CONFIG : PACKAGE_ROLE_CONFIG

  // Group members by role
  const groupedMembers = Object.entries(roleConfig)
    .map(([role, config]) => ({
      role,
      label: config.label,
      order: config.order,
      members: activeMembers.filter((m) => m.role === role),
    }))
    .filter((group) => group.members.length > 0)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      {groupedMembers.length > 0 ? (
        <div className="space-y-4">
          {groupedMembers.map((group) => (
            <RoleSection
              key={group.role}
              label={group.label}
              members={group.members}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No members</p>
      )}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onManageClick}
        >
          Manage members ({totalCount})
        </Button>
      )}
    </div>
  )
}
