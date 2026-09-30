import type { Metadata } from "next";
import { enforceEntry } from "@/lib/entry-cascade";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

// See `src/app/(app)/page.tsx` for why every page in this app is noindexed.
export const metadata: Metadata = {
  title: "Not set up yet",
  robots: { index: false, follow: false },
};

// Informational only. The first administrator is created from the command line
// (`pnpm create-admin`), never from the browser: an open setup form would let
// whoever reaches a fresh deployment first claim it. So this page deliberately
// carries no controls or instructions — a visitor can only be told to wait.
export default async function SetupPage() {
  await enforceEntry("/setup");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Not set up yet</CardTitle>
          <CardDescription>
            This app hasn&apos;t been configured yet. Please contact the administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
