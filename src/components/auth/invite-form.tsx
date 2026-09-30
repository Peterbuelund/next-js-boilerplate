"use client";

import { useState } from "react";
import Link from "next/link";
import { redeemInviteAction } from "@/app/auth/invite/actions";
import { INVALID_INVITE_MESSAGE } from "@/lib/admin-invite-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

export function InvalidInviteCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Invalid link</CardTitle>
        <CardDescription>{INVALID_INVITE_MESSAGE}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function InviteForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<"form" | "done" | "invalid">("form");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Expected failures come back as values, not throws — see
      // `@/lib/action-result`.
      const result = await redeemInviteAction({ token, password });
      if (result.ok) {
        setState("done");
      } else if (result.error === INVALID_INVITE_MESSAGE) {
        // Used or expired between page load and submit.
        setState("invalid");
      } else {
        setError(result.error);
      }
    } catch {
      // Something unexpected threw; Next redacts the message in production.
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (state === "invalid") return <InvalidInviteCard />;

  if (state === "done") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password set</CardTitle>
          <CardDescription>Your password has been set. You can now sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/sign-in" className="text-sm text-primary hover:underline">
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>Choose a password for your administrator account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm">Confirm new password</FieldLabel>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
