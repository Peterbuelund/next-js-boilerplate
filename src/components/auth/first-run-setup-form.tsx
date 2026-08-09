"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { createFirstAdminAction } from "@/app/setup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

export function FirstRunSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // The action reports expected failures ("Setup is already complete",
      // "Email already in use") as a returned value rather than a throw,
      // because Next redacts thrown Server Action messages in production
      // builds — see `@/lib/action-result`.
      const setupResult = await createFirstAdminAction({ name, email, password });
      if (!setupResult.ok) {
        setError(setupResult.error);
        return;
      }
      // Better Auth's client returns { data, error } and never throws, so the
      // result must be checked explicitly. The admin already exists at this
      // point; if auto sign-in fails, send them to sign in manually rather than
      // silently bouncing off the session-guarded home page.
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        router.push("/auth/sign-in");
        router.refresh();
        return;
      }
      router.push("/");
      // Drop the cached RSC payload so the session-guarded pages re-render
      // against the cookie that sign-in just set.
      router.refresh();
    } catch {
      // Reaching here means something unexpected threw (an unreachable
      // database, a bug). Next redacts that message in production, so there is
      // nothing worth rendering from it — show a generic line instead.
      setError("Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>Create the first administrator account to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create admin account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
