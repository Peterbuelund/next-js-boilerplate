import { Suspense } from "react";
import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { user } from "@/lib/schema";
import { requireAdminOrRedirect } from "@/lib/auth-guards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminPanel } from "@/components/admin/admin-panel";
import { UsersSectionSkeleton } from "@/components/admin/users-section-skeleton";

// See `src/app/(app)/page.tsx` for why every page in this app is noindexed.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The awaited half of this route: the users query and the panel it feeds.
 *
 * Split out of the page purely so it can sit behind a `<Suspense>` boundary. As
 * one flat page body, the `await` on this query blocked the entire response —
 * sidebar, header and all — on Postgres before a single byte of HTML went out.
 * Isolated here, the chrome streams immediately and only this region waits.
 *
 * It takes `db` as a prop rather than importing the handle itself, which keeps
 * the ordering honest: the only handle in scope is the one the page received
 * from `requireAdminOrRedirect`, so this component cannot be rendered on a path
 * where the admin guard has not already run.
 */
async function UsersSection({
  db,
  currentUserId,
}: {
  // Derived from the guard's own return type rather than imported from
  // `@/lib/db`, so the two can never drift and the page needs no direct
  // dependency on the database module.
  db: Awaited<ReturnType<typeof requireAdminOrRedirect>>["db"];
  currentUserId: string;
}) {
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return <AdminPanel users={users} currentUserId={currentUserId} />;
}

export default async function AdminPage() {
  // Stays in the page body, deliberately *outside* the Suspense boundary below.
  // This is an authorization gate, not a data fetch: an unauthorized caller must
  // be redirected before anything renders, not shown a streaming shell that only
  // later admits they were never allowed to see it.
  const { user: currentUser, db } = await requireAdminOrRedirect();

  // The guard already resolved the session, so the sidebar footer gets its
  // identity as a prop instead of re-fetching it from the client after
  // hydration. Only the fields NavUser renders cross the boundary.
  const sidebarUser = {
    name: currentUser.name || "User",
    email: currentUser.email || "",
    avatar: currentUser.image || "",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <Header title="Admin" />
        {/* Same skeleton `loading.tsx` uses, so the route-level fallback hands
            off to this one without the content region shifting. */}
        <Suspense fallback={<UsersSectionSkeleton />}>
          <UsersSection db={db} currentUserId={currentUser.id} />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
