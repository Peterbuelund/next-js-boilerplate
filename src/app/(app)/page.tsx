import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { enforceEntry } from "@/lib/entry-cascade";

// Reads runtime DB/session state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

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
