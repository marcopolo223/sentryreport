import { PLAN_LIMITS, type MembershipPlanId } from "@/lib/plans";
import { formatBytes } from "@/lib/reports";
import { cn } from "@/lib/utils";

export function StorageMeter({
  usedBytes,
  planId,
}: {
  usedBytes: number;
  planId: MembershipPlanId;
}) {
  const limit = PLAN_LIMITS[planId].storageBytes;
  const overage = PLAN_LIMITS[planId].overagePerGbCents;
  const ratio = limit > 0 ? Math.min(usedBytes / limit, 1) : 0;
  const over = usedBytes > limit;
  const overBytes = Math.max(0, usedBytes - limit);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Media storage
          </p>
          <p className="mt-1 text-sm text-foreground">
            {formatBytes(usedBytes)} of {formatBytes(limit)}
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {Math.round((usedBytes / limit) * 100)}%
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            over ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${Math.max(over ? 100 : ratio * 100, usedBytes > 0 ? 4 : 0)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {over
          ? `${formatBytes(overBytes)} over the included amount${
              overage
                ? ` · overage is billed at $${(overage / 100).toFixed(2)}/GB`
                : ""
            }.`
          : overage
            ? `Included with this plan. Extra usage is $${(overage / 100).toFixed(2)}/GB.`
            : "Included with Free. Upgrade for more storage."}
      </p>
    </div>
  );
}
