"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GalleryVerticalEnd,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import { NavUser, type NavUserUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type NavItemDef = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const navItems: NavItemDef[] = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
]

/**
 * The nav reads a step larger than shadcn's `text-sm` default, in a taller row
 * that keeps the padding around the bigger label from looking pinched, with the
 * icons scaled to match so they still sit optically level with it. Applied
 * per-button rather than by editing `ui/sidebar.tsx`: that file is generated
 * shadcn scaffolding shared by every sidebar in the app, and `cn()` merges this
 * over the variant's `text-sm`/`size-4`, so the override lands without forking
 * the primitive.
 */
const navButtonClass = "h-10 text-[0.95rem] [&_svg]:size-[1.15rem]"

function NavItem({
  item,
  isActive,
}: {
  item: NavItemDef
  isActive: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        className={navButtonClass}
      >
        <Link href={item.url}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * `user` is threaded straight through to the footer rather than fetched there.
 * The pages that render this sidebar are Server Components that have already
 * resolved the session to decide whether to render at all, so passing it down
 * costs nothing, whereas re-asking for it in the client cost an extra HTTP round
 * trip after hydration plus a visible loading flicker in the footer.
 *
 * Optional because the `loading.tsx` fallbacks mount this same sidebar for real
 * (so the swap to the finished page moves nothing) and, by definition, have not
 * awaited anything yet. NavUser renders a disabled placeholder in that case.
 */
export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: NavUserUser }) {
  const pathname = usePathname()
  const isActive = (url: string) =>
    url === "/"
      ? pathname === "/"
      : pathname === url || pathname.startsWith(url + "/")

  // No collapse control: the sidebar stays open on desktop. On a phone it is an
  // offcanvas sheet, so the nav still needs one way in — this trigger, rendered
  // once here rather than in every page's header.
  return (
    <>
      <SidebarTrigger className="fixed top-3 left-3 z-50 md:hidden" />
      <Sidebar collapsible="offExamples" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <span className="font-medium">Next.js Boilerplate</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem
                  key={item.title}
                  item={item}
                  isActive={isActive(item.url)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <NavItem
              item={{ title: "Admin", url: "/admin", icon: Settings }}
              isActive={isActive("/admin")}
            />
          </SidebarMenu>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
