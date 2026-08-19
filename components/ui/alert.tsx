import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Alert({
  children,
  className,
  variant = "error",
}: {
  children: ReactNode;
  className?: string;
  variant?: "error" | "info";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
