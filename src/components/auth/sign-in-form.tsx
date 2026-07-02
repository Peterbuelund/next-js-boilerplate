"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

function getFriendlyError(message: string, status?: number): string {
  const lower = message.toLowerCase();
  if (
    (status !== undefined && status >= 500) ||
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("econnrefused")
  ) {
    return "Cannot reach the server — make sure the database and backend are running.";
  }
  if (
    status === 401 ||
    lower.includes("invalid") ||
    lower.includes("credentials") ||
    lower.includes("password")
  ) {
    return "Invalid email or password.";
  }
  return message || "Sign in failed.";
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password, rememberMe });
      if (result.error) {
        setError(getFriendlyError(result.error.message ?? "Sign in failed", result.error.status ?? undefined));
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(getFriendlyError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border-border flex w-full max-w-[440px] flex-col gap-6 rounded-2xl border p-12 shadow-[0_8px_30px_rgba(0,0,0,0.07)]">
      <div className="mb-2 flex flex-col items-center gap-1.5">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-lg font-bold">
          B
        </div>
        <h1 className="text-foreground mt-2 text-xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FieldGroup className="gap-6">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="ana@acme.ai"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
        </FieldGroup>

        <div className="-mt-2 flex items-center justify-between">
          <Label htmlFor="remember-me" className="text-[13px] font-normal">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            Remember me
          </Label>
          <Link href="/auth/forgot-password" className="text-primary text-[13px]">
            Forgot password?
          </Link>
        </div>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
