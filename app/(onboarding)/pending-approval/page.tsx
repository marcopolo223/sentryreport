import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeHeader } from "@/components/home-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLatestMembership, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request sent",
};

export default async function PendingApprovalPage() {
  const { user } = await requireUser();
  const membership = await getLatestMembership(user.id);

  if (!membership || membership.status !== "pending") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader />
      <main id="main" className="page-pad flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Request sent</CardTitle>
            <CardDescription className="leading-relaxed">
              Your request to join was sent. An administrator will review it.
              You will not see any organization data until you are approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You can return to the dashboard while you wait. Pending requests
              show up there as well.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
