import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { BillingBanner } from "@/components/billing/billing-banner";
import { requireMember } from "@/lib/auth";

export default async function OfficerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireMember();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <BillingBanner />
      <main id="main" className="page-pad mx-auto w-full min-w-0 max-w-6xl flex-1 py-8">
        {children}
      </main>
    </div>
  );
}
