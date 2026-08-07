import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { enforceEntry } from "@/lib/entry-cascade";

// Reads runtime DB/session state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

// `title` feeds the root layout's `%s | Next.js Boilerplate` template, so this
// renders as "Dashboard | Next.js Boilerplate".
//
// THE NOINDEX RATIONALE, stated once here and repeated as a bare `robots` block
// on every other page: this app has no public surface. Every route sits behind
// the entry cascade or an auth guard, including `/` — so a crawler that reaches
// one only ever sees a redirect to a sign-in screen, and indexing that produces
// search results that lead nowhere. The per-page `robots` is belt-and-braces on
// top of `robots.ts`: `robots.txt` asks crawlers not to fetch, while the
// `noindex` meta tag also covers the ones that fetch anyway (and any URL that
// gets shared directly). If this boilerplate ever grows a genuinely public
// marketing page, that page — and only that page — omits the block.
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Lives in the `(app)` route group, not the root segment. The parentheses are
// stripped from the URL, so this is still `/` — the group exists only to give
// the dashboard its own sidebar-shaped `loading.tsx` instead of inheriting the
// root centered-card fallback, whose shape does not match this page at all.
export default async function Page() {
  await enforceEntry("/");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title="Dashboard" />
        <div className="p-6" />
      </SidebarInset>
    </SidebarProvider>
  );
}
