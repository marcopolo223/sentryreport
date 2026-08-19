import type { Metadata } from "next";
import Link from "next/link";

import { joinOrganization } from "@/app/actions/org";
import { HomeHeader } from "@/components/home-header";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Join organization",
};

export default async function JoinOrganizationPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader />
      <main id="main" className="page-pad flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Join an organization</CardTitle>
          </CardHeader>
          <CardContent>
            {searchParams.error && (
              <Alert className="mb-4">{searchParams.error}</Alert>
            )}
            <form action={joinOrganization} className="space-y-4">
              <div>
                <Label htmlFor="joinCode">Join code</Label>
                <Input
                  id="joinCode"
                  name="joinCode"
                  required
                  minLength={6}
                  maxLength={8}
                  spellCheck={false}
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="uppercase tracking-[0.2em]"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  6 or 8 characters, from your administrator.
                </p>
              </div>
              <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
                Send request
              </SubmitButton>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/dashboard" className="font-medium text-primary hover:underline">
                Back to dashboard
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
