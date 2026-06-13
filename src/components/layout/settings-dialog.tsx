"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// Stable no-op subscriber for the hydration probe in AppearanceSection. Matches
// the convention in nav-user.tsx: useSyncExternalStore returns the server
// snapshot (false) during SSR and the first client render, then the client
// snapshot (true) afterwards — a setState-free mount detector the project's lint
// rules allow. See the comment block in nav-user.tsx for the full rationale.
const subscribeNoop = () => () => {}

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { name: string; email: string }
}

type SettingsSection = "profile" | "security" | "appearance"

const NAV_ITEMS: { id: SettingsSection; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
]

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your account settings.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row h-[32rem] md:h-[34rem]">
          <nav className="flex flex-row gap-1 overflow-x-auto border-b p-2 sm:w-48 sm:shrink-0 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors sm:w-full",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeSection === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Separator
            orientation="vertical"
            className="hidden sm:block h-auto"
          />
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === "profile" && (
              <ProfileSection key={user.name} user={user} />
            )}
            {activeSection === "security" && <SecuritySection />}
            {activeSection === "appearance" && <AppearanceSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProfileSection({ user }: { user: { name: string; email: string } }) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const { error: updateError } = await authClient.updateUser({ name })
    if (updateError) {
      setError(updateError.message ?? "Failed to update profile")
      setLoading(false)
      return
    }

    setSuccess("Profile updated.")
    router.refresh()
    setLoading(false)
  }

  const disabled = loading || name === user.name || name.trim() === ""

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">Update your display name.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-profile-name">Name</FieldLabel>
            <Input
              id="settings-profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-profile-email">Email</FieldLabel>
            <Input
              id="settings-profile-email"
              type="email"
              value={user.email}
              disabled
            />
          </Field>
        </FieldGroup>
        {error && <FieldError>{error}</FieldError>}
        {success && <p className="text-sm text-muted-foreground">{success}</p>}
        <Button type="submit" disabled={disabled} className="self-start">
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </section>
  )
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    })
    if (changeError) {
      setError(changeError.message ?? "Failed to update password")
      setLoading(false)
      return
    }

    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSuccess("Password updated.")
    setLoading(false)
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-muted-foreground">Change your password.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
            <Input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
            <Input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-confirm-password">Confirm new password</FieldLabel>
            <Input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
        </FieldGroup>
        {error && <FieldError>{error}</FieldError>}
        {success && <p className="text-sm text-muted-foreground">{success}</p>}
        <Button type="submit" disabled={loading} className="self-start">
          {loading ? "Saving..." : "Update password"}
        </Button>
      </form>
    </section>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  // next-themes returns `theme === undefined` on the server and the first client
  // render; binding that to the Select value would cause a hydration mismatch.
  // Gate on a mount probe — same useSyncExternalStore convention as nav-user.tsx
  // — and only pass a controlled `value` once mounted.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">Choose how the app looks.</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="settings-theme">Theme</FieldLabel>
          {mounted ? (
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="settings-theme" className="w-full sm:w-60">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            // Pre-mount placeholder: a disabled Select with no value so we never
            // bind `theme` (undefined on first render) and avoid the mismatch.
            <Select disabled>
              <SelectTrigger
                id="settings-theme"
                className="w-full sm:w-60"
                aria-label="Theme"
              >
                <SelectValue placeholder="Loading..." />
              </SelectTrigger>
            </Select>
          )}
        </Field>
      </FieldGroup>
    </section>
  )
}
