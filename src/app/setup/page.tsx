import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/users";
import { getSystemReadiness } from "@/lib/system-readiness";
import { FirstRunSetupForm } from "@/components/auth/first-run-setup-form";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await getSystemReadiness()).ready) redirect("/preflight");
  if (await hasAdmin()) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FirstRunSetupForm />
    </div>
  );
}
