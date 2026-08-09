"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { SettingsDialog } from "./settings-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

/**
 * The identity this footer renders. Deliberately a flat, serializable shape
 * rather than Better Auth's `User`: it crosses the server -> client boundary as
 * an RSC prop, and narrowing it here means the session's other fields (id,
 * role, timestamps) never get serialized into the payload sent to the browser.
 */
export type NavUserUser = {
  name: string
  email: string
  avatar: string
}

export function NavUser({ user }: { user?: NavUserUser } = {}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // No user means we are rendering sidebar chrome that has no session in hand —
  // in practice the `loading.tsx` fallbacks, which mount the *real* AppSidebar
  // so the swap to the finished page moves nothing. Show the same disabled,
  // Radix-free placeholder the footer used to show pre-mount.
  //
  // This branch used to be gated on a `useSyncExternalStore` mount probe rather
  // than on the prop, because the session arrived asynchronously from
  // `authClient.useSession()` and the signed-in/signed-out branches could
  // therefore disagree between the server render and the first client render —
  // and since only the signed-in branch mounts a DropdownMenu/Dialog (both of
  // which consume React.useId), that disagreement shifted every downstream
  // Radix useId and broke hydration on unrelated components. The user now
  // arrives as a prop resolved on the server, so both renders see the identical
  // value and pick the identical branch: the probe has nothing left to paper
  // over and is gone, along with its extra post-hydration session round trip.
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <span className="size-8 shrink-0 rounded-lg bg-sidebar-accent" />
            <div className="grid flex-1 gap-1.5">
              <span className="h-3 w-24 rounded bg-sidebar-accent" />
              <span className="h-2.5 w-32 rounded bg-sidebar-accent" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/auth/sign-in")
    // Drop the cached RSC payload so no signed-in server render survives the
    // sign-out in the client-side Router Cache.
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={{ name: user.name, email: user.email }}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
