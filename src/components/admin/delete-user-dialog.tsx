"use client"

import { useRouter } from "next/navigation"
import { deleteUserAction } from "@/app/admin/actions"
import { useServerAction } from "@/hooks/use-server-action"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type DeleteUserDialogProps = {
  user: { id: string; email: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteUserDialog({ user, open, onOpenChange }: DeleteUserDialogProps) {
  const router = useRouter()

  const { run, isPending, error } = useServerAction(deleteUserAction, {
    fallbackMessage: "Failed to delete user",
    onSuccess: () => {
      router.refresh()
      onOpenChange(false)
    },
  })

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent AlertDialogAction's default close behavior so the dialog stays
    // open if the server action throws.
    e.preventDefault()
    run({ userId: user.id })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete {user.email}? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
