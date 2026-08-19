import type { ReactNode } from "react";
import Link from "next/link";

import { BrandLogoMark } from "@/components/brand-logo-mark";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-foreground px-10 py-10 text-background lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,hsl(var(--primary)/0.28),transparent_60%)]"
          aria-hidden
        />
        <Link
          href="/"
          className="relative inline-flex items-center gap-2.5 rounded-md transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
        >
          <span className="flex h-9 w-9 overflow-hidden rounded-[10px] ring-1 ring-background/15">
            <BrandLogoMark className="h-full w-full" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.045em]">
            Sentry
            <span className="font-medium text-background/70">Report</span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            For security teams
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight">
            {title}
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-background/70 sm:text-base">
            Guided incident reporting — structured in the field, clean enough
            for the file.
          </p>
        </div>
        <p className="relative text-xs text-background/40">SentryReport</p>
      </aside>

      <div className="relative flex flex-col">
        <div className="page-pad flex h-16 items-center justify-between gap-3 lg:justify-end">
          <BrandMark href="/" className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="page-pad flex flex-1 items-center justify-center pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
