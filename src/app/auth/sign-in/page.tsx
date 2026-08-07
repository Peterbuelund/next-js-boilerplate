import type { Metadata } from "next";
import { enforceEntry } from "@/lib/entry-cascade";
import { SignInForm } from "@/components/auth/sign-in-form";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

// See `src/app/(app)/page.tsx` for why every page in this app is noindexed.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  await enforceEntry("/auth/sign-in");

  // The dot texture is drawn from the `--color-border` theme token rather than
  // a hardcoded hex, so the page follows the active theme instead of staying
  // light-on-cream in dark mode like the previous inline styles did.
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:18px_18px]">
      <SignInForm />
    </div>
  );
}
