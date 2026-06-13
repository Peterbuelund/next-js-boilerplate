"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateUserAction, type UserRole } from "@/app/admin/actions"
import { useServerAction } from "@/hooks/use-server-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

type EditUserDialogProps = {
  user: { id: string; name: string; email: string; role: string }
  disableRoleChange: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({
  user,
  disableRoleChange,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<UserRole>(user.role as UserRole)
  const [newPassword, setNewPassword] = useState("")

  const { run, isPending, error } = useServerAction(updateUserAction, {
    fallbackMessage: "Failed to update user",
    onSuccess: () => {
      router.refresh()
      onOpenChange(false)
    },
  })

  // Reset local state when a different row is selected for editing.
  // Adjusting state during render (the React-recommended alternative to a
  // state-syncing effect) — runs synchronously without an extra paint.
  const [prevUserId, setPrevUserId] = useState(user.id)
  if (user.id !== prevUserId) {
    setPrevUserId(user.id)
    setName(user.name)
    setEmail(user.email)
    setRole(user.role as UserRole)
    setNewPassword("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    run({
      userId: user.id,
      name,
      email,
      role: role as UserRole,
      newPassword: newPassword || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update this account&apos;s details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
              <Input
                id="edit-user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-user-email">Email</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-user-role">Role</FieldLabel>
              <select
                id="edit-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={disableRoleChange}
                className="bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-4xl border px-3 py-1 text-base outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-user-new-password">New password</FieldLabel>
              <Input
                id="edit-user-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={newPassword ? 8 : undefined}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current password.
              </p>
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
