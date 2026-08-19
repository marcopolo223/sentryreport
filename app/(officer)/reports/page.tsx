import type { Metadata } from "next";
import { NewReportButton } from "@/components/reports/new-report-button";
import { QueueTabs } from "@/components/reports/queue-tabs";
import { ReportList } from "@/components/reports/report-list";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { requireMember } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import type { ReportStatus } from "@/lib/supabase/types";

const QUEUES: ReportStatus[] = ["draft", "submitted", "finalized"];

export const metadata: Metadata = {
  title: "Reports",
};

function parseQueue(
  value: string | undefined,
  admin: boolean
): ReportStatus {
  if (value && QUEUES.includes(value as ReportStatus)) {
    return value as ReportStatus;
  }
  return admin ? "submitted" : "draft";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { error?: string; status?: string };
}) {
  const { supabase, membership } = await requireMember();
  const orgId = membership.organization_id;
  const admin = isAdminRole(membership.role);
  const queue = parseQueue(searchParams.status, admin);

  const [
    { data: statusRows },
    { data: reports },
    { data: incidentTypes },
    { data: buildings },
    { data: units },
  ] = await Promise.all([
    supabase.from("reports").select("status").eq("organization_id", orgId),
    supabase
      .from("reports")
      .select(
        "id, report_number, status, location_detail, occurred_at, created_at, incident_type_id, building_id, unit_id"
      )
      .eq("organization_id", orgId)
      .eq("status", queue)
      .order("created_at", { ascending: false }),
    supabase
      .from("org_incident_types")
      .select("id, label")
      .eq("organization_id", orgId),
    supabase.from("buildings").select("id, name").eq("organization_id", orgId),
    supabase
      .from("building_units")
      .select("id, unit_number, label")
      .eq("organization_id", orgId),
  ]);

  const typeLabels = new Map((incidentTypes ?? []).map((row) => [row.id, row.label]));
  const buildingNames = new Map((buildings ?? []).map((row) => [row.id, row.name]));
  const unitRows = new Map(
    (units ?? []).map((row) => [row.id, { unitNumber: row.unit_number, unitLabel: row.label }])
  );

  const counts: Record<ReportStatus, number> = {
    draft: 0,
    submitted: 0,
    finalized: 0,
  };
  for (const row of statusRows ?? []) {
    const status = row.status as ReportStatus;
    if (status in counts) counts[status] += 1;
  }

  const rows = (reports ?? []).map((report) => {
    const unit = report.unit_id ? unitRows.get(report.unit_id) : undefined;
    return {
      id: report.id,
      report_number: report.report_number,
      status: report.status as ReportStatus,
      location_detail: report.location_detail,
      occurred_at: report.occurred_at,
      created_at: report.created_at,
      incidentLabel: typeLabels.get(report.incident_type_id ?? "") ?? "Untitled incident",
      buildingName: report.building_id
        ? (buildingNames.get(report.building_id) ?? null)
        : null,
      unitNumber: unit?.unitNumber ?? null,
      unitLabel: unit?.unitLabel ?? null,
    };
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Reports</h1>
          <p className="page-lead">
            {admin
              ? "Drafts, submitted, and finalized stay in separate queues. Open a report to review it."
              : "Drafts you can still edit, plus submitted reports you can open if your organization allows it."}
          </p>
        </div>
        <NewReportButton />
      </div>

      {searchParams.error && <Alert>{searchParams.error}</Alert>}

      <WindowFrame title="Reports">
        <QueueTabs counts={counts} current={queue} />
        <ReportList rows={rows} isAdmin={admin} queue={queue} />
      </WindowFrame>
    </div>
  );
}
