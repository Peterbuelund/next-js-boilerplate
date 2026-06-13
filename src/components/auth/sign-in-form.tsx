"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import Link from "next/link";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
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
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
