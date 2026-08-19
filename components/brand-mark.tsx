import Link from "next/link";

import { BrandLogoMark } from "@/components/brand-logo-mark";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <span
        className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-[10px] ring-1 ring-border shadow-soft"
        aria-hidden
      >
        <BrandLogoMark className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className="text-[17px] font-semibold tracking-[-0.045em] text-foreground">
          Sentry
          <span className="font-medium text-muted-foreground">Report</span>
        </span>
      )}
    </Link>
  );
}
