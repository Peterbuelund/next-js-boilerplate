import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { UsersSectionSkeleton } from "@/components/admin/users-section-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Route-level fallback for `/admin`.
 *
 * It covers the one thing the page still awaits before it can emit any HTML:
 * `requireAdminOrRedirect` (session lookup, then a live re-read of the caller's
 * Role straight from the database). The users query that feeds the table is no
 * longer awaited here — the page streams it inside its own `<Suspense>`, so this
 * fallback is replaced by the real chrome as soon as the guard passes, and only
 * the table region keeps waiting.
 *
 * `/admin` gets its own fallback instead of inheriting the root one because its
 * shape is completely different: the root fallback is a centered auth-card
 * shell, and swapping that for a full sidebar layout would visibly jolt the
 * page. So the chrome here is the *real* chrome — the same
 * SidebarProvider/AppSidebar/SidebarInset/Header the page itself renders, which
 * is static and needs none of the awaited data. AppSidebar is rendered without a
 * `user`: the session is exactly what has not resolved yet, so its footer shows
 * its disabled placeholder. Only the content area is skeletonised, and it uses
 * the same `UsersSectionSkeleton` the page's Suspense boundary falls back to, so
 * this hands off to that one without moving a pixel.
 *
 * A Server Component on purpose (no `"use client"`): the client components it
 * composes bring their own directives, and the skeleton animation is pure CSS.
 */
export default function Loading() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title="Admin" />
        <UsersSectionSkeleton />
      </SidebarInset>
    </SidebarProvider>
  );
}
