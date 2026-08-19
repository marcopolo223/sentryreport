import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/lib/supabase/types";

const QUEUES: { status: ReportStatus; label: string }[] = [
  { status: "draft", label: "Drafts" },
  { status: "submitted", label: "Submitted" },
  { status: "finalized", label: "Finalized" },
];

export function QueueTabs({
  counts,
  current,
}: {
  counts: Record<ReportStatus, number>;
  current: ReportStatus;
}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
      {QUEUES.map((queue) => {
        const active = current === queue.status;
        return (
          <Link
            key={queue.status}
            href={`/reports?status=${queue.status}`}
            className={cn(
              "px-4 py-4 text-center transition-colors duration-200",
              active ? "bg-accent/70" : "hover:bg-accent/40"
            )}
            aria-current={active ? "page" : undefined}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {queue.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {counts[queue.status]}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
