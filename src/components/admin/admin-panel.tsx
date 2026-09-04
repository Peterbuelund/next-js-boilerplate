"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ModelsSection } from "@/components/admin/models-section"
import {
  UsersSection,
  type AdminUser,
} from "@/components/admin/users-section"

type Section = "users" | "models"

const SECTIONS: { id: Section; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "models", label: "Models" },
]

export function AdminPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const [section, setSection] = useState<Section>("users")

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-40 shrink-0">
        <nav aria-label="Admin sections" className="flex flex-col gap-1">
          {SECTIONS.map(({ id, label }) => {
            const isActive = id === section
            return (
              <Button
                key={id}
                variant={isActive ? "secondary" : "ghost"}
                className={
                  isActive
                    ? "w-full justify-start"
                    : "w-full justify-start text-muted-foreground"
                }
                aria-current={isActive ? "page" : undefined}
                onClick={() => setSection(id)}
              >
                {label}
              </Button>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        {section === "users" ? (
          <UsersSection users={users} currentUserId={currentUserId} />
        ) : (
          <ModelsSection />
        )}
      </div>
    </div>
  )
}
