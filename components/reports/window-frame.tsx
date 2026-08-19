import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WindowFrame({
  title,
  trailing,
  children,
  className,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className
      )}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/60 px-4">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-2 min-w-0 flex-1 truncate text-xs font-medium tracking-tight text-muted-foreground">
          {title}
        </span>
        {trailing}
      </div>
      {children}
    </div>
  );
}
