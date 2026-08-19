import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="page-pad border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SentryReport. Guided reporting for
          security teams.
        </p>
        <div className="flex gap-4 text-xs font-medium">
          <Link
            href="/privacy"
            className="text-muted-foreground transition-[color,transform] duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground transition-[color,transform] duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Terms
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground transition-[color,transform] duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-muted-foreground transition-[color,transform] duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
