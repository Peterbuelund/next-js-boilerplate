import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { SetupChecklist } from "@/components/setup-checklist";
import { requireSessionOrRedirect } from "@/lib/auth-guards";
import { env } from "@/env";

export default async function Page() {
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
