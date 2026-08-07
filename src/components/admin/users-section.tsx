"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons"
import { AddUserDialog } from "./add-user-dialog"
import { EditUserDialog } from "./edit-user-dialog"
import { DeleteUserDialog } from "./delete-user-dialog"

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

// This component is a client component, but it is rendered from the server
// `/admin` page, so its markup is produced twice: once during SSR and once
// during hydration. `toLocaleDateString()` with no arguments resolves against
// whatever locale and timezone the process has, which differs between the
// server and the visitor's browser and therefore produces a hydration
// mismatch. Pinning both the locale and the timezone makes the output
// byte-identical on both sides. Built once at module scope because
// `Intl.DateTimeFormat` construction is comparatively expensive.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

function roleBadgeVariant(role: string): "default" | "secondary" | "destructive" {
  if (role === "admin") return "default"
  if (role === "disabled") return "destructive"
  return "secondary"
}

export function UsersSection({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Users</CardTitle>
          <CardDescription>All users in your platform</CardDescription>
        </div>
        <AddUserDialog />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[60px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId
                // `createdAt` is typed as a Date but crosses the RSC boundary,
                // where it can arrive as a serialized string — coerce
                // defensively before formatting.
                const createdAt = new Date(user.createdAt)
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <time dateTime={createdAt.toISOString()}>
                        {DATE_FORMAT.format(createdAt)}
                      </time>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Actions for ${user.email}`}
                          >
                            <HugeiconsIcon
                              icon={MoreHorizontalCircle01Icon}
                              strokeWidth={2}
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(user)}>
                            Edit
                          </DropdownMenuItem>
                          {!isSelf && (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting(user)}
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      {editing && (
        <EditUserDialog
          user={editing}
          disableRoleChange={editing.id === currentUserId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        />
      )}
      {deleting && (
        <DeleteUserDialog
          user={deleting}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
        />
      )}
    </Card>
  )
}
