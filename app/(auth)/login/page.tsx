import type { Metadata } from "next";
import Link from "next/link";

import { login } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { LegalContinueNotice } from "@/components/legal/legal-agree";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const isInfo = searchParams.error?.toLowerCase().includes("check your email");

  return (
    <AuthShell title="Welcome back.">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
        Account
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">Log in</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to your organizations.
      </p>

      {searchParams.error && (
        <Alert className="mt-6" variant={isInfo ? "info" : "error"}>
          {searchParams.error}
        </Alert>
      )}

      <form action={login} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
          Log in
        </SubmitButton>
        <LegalContinueNotice />
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary transition-colors duration-200 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
