import type { ReportStatus } from "@/lib/supabase/types";

export const REPORT_STATUS_VARIANT = {
  draft: "pending",
  submitted: "warning",
  finalized: "success",
} as const;

export function formatReportLocation(input: {
  buildingName?: string | null;
  unitNumber?: string | null;
  unitLabel?: string | null;
  locationDetail?: string | null;
}) {
  const unit = input.unitLabel || input.unitNumber;
  const parts = [input.buildingName, unit, input.locationDetail].filter(Boolean);
  return parts.join(" · ") || "Location not set";
}

export function formatReportWhen(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function statusLabel(status: ReportStatus) {
  return status.replace("_", " ");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}
