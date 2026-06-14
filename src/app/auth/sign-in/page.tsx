import { redirect } from "next/navigation";
import { entryDestination } from "@/lib/entry-cascade";
import { SignInForm } from "@/components/auth/sign-in-form";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const dest = await entryDestination();
  if (dest !== "/auth/sign-in") redirect(dest ?? "/");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SignInForm />
    </div>
  );
}
