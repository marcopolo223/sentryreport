import type { Metadata } from "next";
import Link from "next/link";

import { signup } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { LegalAgreeCheckbox } from "@/components/legal/legal-agree";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; plan?: string };
}) {
  const plan =
    searchParams.plan === "standard" || searchParams.plan === "pro"
      ? searchParams.plan
      : "";
  return (
    <AuthShell title="Start in minutes.">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
        Account
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create an account</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Then create a property or join one with a code.
        {plan
          ? ` You picked ${plan === "pro" ? "Pro" : "Standard"} — you can upgrade after the organization exists.`
          : ""}
      </p>

      {searchParams.error && <Alert className="mt-6">{searchParams.error}</Alert>}

      <form action={signup} className="mt-6 space-y-4">
        {plan ? <input type="hidden" name="plan" value={plan} /> : null}
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </div>
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
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <LegalAgreeCheckbox />
        <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">
          Sign up
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary transition-colors duration-200 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
