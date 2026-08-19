import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main" className="page-pad mx-auto w-full min-w-0 max-w-6xl flex-1 py-8">
        {children}
      </main>
    </div>
  );
}
