import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { SetupChecklist } from "@/components/setup-checklist";
import { requireSessionOrRedirect } from "@/lib/auth-guards";
import { hasAdmin } from "@/lib/users";
import { env } from "@/env";

// Reads runtime DB/session state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function Page() {
    if (!(await hasAdmin())) redirect("/setup");
    await requireSessionOrRedirect();
    const showSetupChecklist = env.isDev;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header title="Dashboard" />
                <div className="p-6">
                    {showSetupChecklist && <SetupChecklist />}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
