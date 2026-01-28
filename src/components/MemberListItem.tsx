import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface MemberListItemProps {
  name?: string | null
  email: string
  image?: string | null
  role: string
  roleLabel?: string
  isPending?: boolean
  canRemove?: boolean
  isRemoving?: boolean
  onRemove?: () => void
  removeDialogTitle?: string
  removeDialogDescription?: string
}

/**
 * Reusable component for displaying a member in a list with optional remove functionality.
 * Used across SettingsDialog, ProjectSettingsDialog, and PackageSettingsDialog.
 */
export function MemberListItem({
  name,
  email,
  image,
  role,
  roleLabel,
  isPending = false,
  canRemove = false,
  isRemoving = false,
  onRemove,
  removeDialogTitle = "Remove member?",
  removeDialogDescription,
}: MemberListItemProps) {
  const displayName = name || email
  const initials = displayName.charAt(0).toUpperCase()
  const displayRole = roleLabel || role

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {image ? (
        <img
          src={image}
          alt=""
          className="size-7 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-xs">{displayName}</p>
        {name && (
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        )}
        {isPending && <p className="text-xs text-amber-600">Pending signup</p>}
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
        {displayRole}
      </span>
      {canRemove && onRemove && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
              disabled={isRemoving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{removeDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {removeDialogDescription || (
                  <>
                    Are you sure you want to remove{" "}
                    <strong>{displayName}</strong>? This action cannot be
                    undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
