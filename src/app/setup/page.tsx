import type { Metadata } from "next";
import { enforceEntry } from "@/lib/entry-cascade";
import { FirstRunSetupForm } from "@/components/auth/first-run-setup-form";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

// See `src/app/(app)/page.tsx` for why every page in this app is noindexed.
export const metadata: Metadata = {
  title: "First-run setup",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  await enforceEntry("/setup");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FirstRunSetupForm />
    </div>
  );
}
