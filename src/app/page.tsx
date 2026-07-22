import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { enforceEntry } from "@/lib/entry-cascade";

// Reads runtime DB/session state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

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
