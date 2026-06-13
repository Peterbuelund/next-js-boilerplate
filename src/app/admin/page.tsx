import { desc } from "drizzle-orm";
import { user } from "@/lib/schema";
import { requireAdminOrRedirect } from "@/lib/auth-guards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const { user: currentUser, db } = await requireAdminOrRedirect();

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title="Admin" />
        <AdminPanel
          users={users}
          currentUserId={currentUser.id}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
