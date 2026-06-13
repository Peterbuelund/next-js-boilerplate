import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { requireSessionOrRedirect } from "@/lib/auth-guards";
import { hasAdmin } from "@/lib/users";
import { getSystemReadiness } from "@/lib/system-readiness";

// Reads runtime DB/session state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function Page() {
    if (!(await getSystemReadiness()).ready) redirect("/preflight");
    if (!(await hasAdmin())) redirect("/setup");
    await requireSessionOrRedirect();

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
