import type { Metadata } from "next";
import Link from "next/link";

import { CreateOrganizationWizard } from "@/components/create-organization-wizard";
import { HomeHeader } from "@/components/home-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New organization",
};

export default async function CreateOrganizationPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader />
      <main id="main" className="page-pad flex flex-1 items-start justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl">New organization</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateOrganizationWizard error={searchParams.error} />
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
