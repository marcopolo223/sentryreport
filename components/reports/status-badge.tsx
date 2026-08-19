import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_VARIANT, statusLabel } from "@/lib/reports";
import type { ReportStatus } from "@/lib/supabase/types";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant={REPORT_STATUS_VARIANT[status]} className="capitalize whitespace-nowrap">
      {statusLabel(status)}
    </Badge>
  );
}
