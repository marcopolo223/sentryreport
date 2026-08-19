import type { Metadata } from "next";
import { updateAccountPassword, updateAccountProfile } from "@/app/actions/auth";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { error?: string; saved?: string };
}) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-6">
      <div>
        <h1>Account</h1>
        <p className="page-lead">
          Your name, email, and password. This is separate from organization
          settings.
        </p>
      </div>

      {searchParams.error && <Alert>{searchParams.error}</Alert>}
      {searchParams.saved && !searchParams.error && (
        <Alert variant="info">Saved.</Alert>
      )}

      <WindowFrame title="Profile">
        <form action={updateAccountProfile} className="space-y-4 p-4">
          <div>
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={profile?.full_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={profile?.email ?? user.email ?? ""}
            />
          </div>
          <SubmitButton>Save profile</SubmitButton>
        </form>
      </WindowFrame>

      <WindowFrame title="Password">
        <form action={updateAccountPassword} className="space-y-4 p-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
        </form>
      </WindowFrame>
    </div>
  );
}
