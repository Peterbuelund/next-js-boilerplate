import { redirect } from "next/navigation";
import { SetupChecklist } from "@/components/setup-checklist";
import { getSystemReadiness } from "@/lib/system-readiness";

// Reads runtime DB/env state, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function PreflightPage() {
  if ((await getSystemReadiness()).ready) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            System not ready yet
          </h1>
          <p className="text-muted-foreground text-sm">
            The application can&apos;t start until the checks below pass. Resolve
            the items marked as failing, then this page will automatically
            continue.
          </p>
        </div>
        <SetupChecklist />
      </div>
    </div>
  );
}
