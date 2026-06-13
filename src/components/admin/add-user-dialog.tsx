"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserAction, type UserRole } from "@/app/admin/actions"
import { useServerAction } from "@/hooks/use-server-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

export function AddUserDialog() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("user")
  const [open, setOpen] = useState(false)

  const { run, isPending, error } = useServerAction(createUserAction, {
    fallbackMessage: "Failed to create user",
    onSuccess: () => {
      setName("")
      setEmail("")
      setPassword("")
      setRole("user" as UserRole)
      router.refresh()
      setOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    run({ name, email, password, role })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="default" aria-label="Add user">
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Provision a new account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-user-name">Name</FieldLabel>
              <Input
                id="add-user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-user-email">Email</FieldLabel>
              <Input
                id="add-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-user-password">Password</FieldLabel>
              <Input
                id="add-user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-user-role">Role</FieldLabel>
              <select
                id="add-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-4xl border px-3 py-1 text-base outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="disabled">Disabled</option>
              </select>
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
              {isPending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
