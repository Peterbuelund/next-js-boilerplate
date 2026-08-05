"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
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

// Stable no-op subscriber for the hydration probe below. useSyncExternalStore
// returns the server snapshot (false) during SSR and the first client render,
// then the client snapshot (true) afterwards — a setState-free way to detect
// mount that the project's "no setState in effect" lint rule allows.
const subscribeNoop = () => () => {}

export function NavUser({
  user,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
} = {}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Render a stable, Radix-free placeholder on the server render and the first
  // client render, then swap in the real menu after mount. authClient.useSession
  // resolves asynchronously and its store is a module-level singleton, so the
  // signed-in vs. signed-out branches below can differ between the server render
  // and the first client render (e.g. when arriving via client navigation from a
  // page that already populated the session). Because the signed-in branch
  // mounts a DropdownMenu/Dialog (which consume React.useId) and the signed-out
  // branch does not, that divergence shifts every downstream Radix useId,
  // producing hydration mismatches on unrelated components (see the prompt input
  // on /skill-chat). Gating on `mounted` keeps the useId-fork count identical
  // across server and first client render. See also NavItem in app-sidebar.tsx.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )

  if (!mounted) {
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

  // Handle loading/no session state
  if (!session?.user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/auth/sign-in">Sign In</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const displayUser = user || {
    name: session.user.name || "User",
    email: session.user.email || "",
    avatar: session.user.image || "",
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
                <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                <AvatarFallback className="rounded-lg">
                  {displayUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayUser.name}</span>
                <span className="truncate text-xs">{displayUser.email}</span>
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
                  <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {displayUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayUser.name}</span>
                  <span className="truncate text-xs">{displayUser.email}</span>
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
          user={{ name: displayUser.name, email: displayUser.email }}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
