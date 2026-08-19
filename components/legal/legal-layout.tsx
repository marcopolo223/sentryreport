import type { ReactNode } from "react";
import Link from "next/link";

import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

export function LegalLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHeader />
      <main id="main" className="page-pad mx-auto w-full max-w-3xl flex-1 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3">{title}</h1>
        <p className="page-lead">{description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Effective {LEGAL_EFFECTIVE_DATE}. Last updated {LEGAL_EFFECTIVE_DATE}.
        </p>
        <article className="legal-doc mt-10">{children}</article>
        <p className="mt-12 text-sm">
          <Link href="/" className="font-medium text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
