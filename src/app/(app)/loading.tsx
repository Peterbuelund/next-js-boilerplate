import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Suspense fallback for the `(app)` route group — today just `/`, the dashboard.
 *
 * The group exists purely so this file can exist. `/` lives in the root segment
 * by URL, which means without a route group its fallback would be the root
 * `loading.tsx` — a centered auth-style card. But `/` renders a full sidebar
 * layout, so the user would see a card flash and then jerk into a sidebar: worse
 * than showing nothing at all. Wrapping the page in `(app)/` gives it its own
 * `loading.tsx` boundary while contributing nothing to the URL (parenthesised
 * directories are stripped from the path), so `/` is still `/`.
 *
 * What is being waited on: `enforceEntry("/")` — the entry cascade's `hasAdmin`
 * probe followed by a session lookup, two sequential round trips — and the page
 * is `force-dynamic`, so there is no prerendered shell to fall back on.
 *
 * Same tactic as `/admin`'s fallback: the chrome here is the *real* chrome, not
 * a skeleton of it. SidebarProvider/AppSidebar/SidebarInset/Header need none of
 * the awaited data, so rendering them for real means the swap to the finished
 * page moves nothing — only the content region changes.
 *
 * That content region is deliberately thin. The dashboard page body is
 * currently an empty `<div className="p-6" />` placeholder, so inventing cards
 * and charts here would promise widgets that never arrive — a bigger jolt than
 * the one this file was written to prevent. One modest heading-height bar is
 * enough to signal "working" honestly; grow this in step with the real page.
 *
 * A Server Component on purpose (no `"use client"`): the composed client
 * components carry their own directives, and the pulse is pure CSS.
 */
export default function Loading() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title="Dashboard" />
        {/* Mirrors the page's own `p-6` content wrapper exactly. */}
        <div className="p-6">
          {/* aria-busy + a polite live region so a screen reader announces the
              wait instead of reading a page with nothing in it. */}
          <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading dashboard</span>
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
