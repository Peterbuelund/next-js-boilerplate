"use client"

import {
  UsersSection,
  type AdminUser,
} from "@/components/admin/users-section"

export function AdminPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  return (
    <div className="p-6">
      <UsersSection users={users} currentUserId={currentUserId} />
    </div>
  )
}
