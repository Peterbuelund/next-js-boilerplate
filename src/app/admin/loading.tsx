import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Suspense fallback for `/admin`.
 *
 * It covers two awaited round trips the page makes before rendering:
 * `requireAdminOrRedirect` (session lookup, then a live re-read of the caller's
 * Role straight from the database) and, once that passes, the users query that
 * feeds the table.
 *
 * `/admin` gets its own fallback instead of inheriting the root one because its
 * shape is completely different: the root fallback is a centered auth-card
 * shell, and swapping that for a full sidebar layout would visibly jolt the
 * page. So the chrome here is the *real* chrome — the same
 * SidebarProvider/AppSidebar/SidebarInset/Header the page itself renders, which
 * is static and needs none of the awaited data. Only the content area is
 * skeletonised, so when the real page swaps in, nothing moves; the table simply
 * fills in.
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
        {/* Mirrors AdminPanel's `p-6` wrapper around the users Card. */}
        <div className="p-6">
          <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading users</span>
            <Card>
              {/* CardHeader: title + description on the left, "Add user" on the right. */}
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
                <Skeleton className="h-9 w-28 rounded-md" />
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="space-y-3 px-6 pb-6">
                  {/* One placeholder row per table row. Five is an arbitrary but
                      plausible count: enough to read as a table, few enough that
                      a smaller real result set does not collapse the page. */}
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4"
                      aria-hidden="true"
                    >
                      {/* Name / Email / Role / Joined / Actions — the five columns. */}
                      <Skeleton className="h-4 w-[22%] rounded-md" />
                      <Skeleton className="h-4 w-[30%] rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="ml-auto size-8 rounded-md" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
