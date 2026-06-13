import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/users";
import { SignUpForm } from "@/components/auth/sign-up-form";

// Depends on runtime DB state (whether an Admin exists), so it must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (!(await hasAdmin())) redirect("/setup");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SignUpForm />
    </div>
  );
}
