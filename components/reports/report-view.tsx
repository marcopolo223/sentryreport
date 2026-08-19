import { MediaAttach } from "@/components/intake/media-attach";
import { AmendmentsPanel } from "@/components/reports/amendments-panel";
import { DeleteReportButton } from "@/components/reports/delete-report-button";
import { ExportReportButton } from "@/components/reports/export-button";
import { ReportStatusBadge } from "@/components/reports/status-badge";
import { WindowFrame } from "@/components/reports/window-frame";
import { formatReportLocation, formatReportWhen } from "@/lib/reports";
import type { Tables } from "@/lib/supabase/types";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

type AmendmentRow = Tables<"report_amendments"> & { authorName: string };

export function ReportView({
  report,
  incidentLabel,
  buildingName,
  unitNumber,
  unitLabel,
  agencies,
  vehicles,
  people,
  damage,
  media,
  amendments,
  orgId,
  userId,
  videoSeconds,
  canAmend,
  canDelete,
}: {
  report: Tables<"reports">;
  incidentLabel: string;
  buildingName: string | null;
  unitNumber: string | null;
  unitLabel: string | null;
  agencies: Tables<"report_agencies">[];
  vehicles: Tables<"report_vehicles">[];
  people: Tables<"report_people">[];
  damage: Tables<"report_property_damage"> | null;
  media: Tables<"report_media">[];
  amendments: AmendmentRow[];
  orgId: string;
  userId: string;
  videoSeconds: number;
  canAmend: boolean;
  canDelete: boolean;
}) {
  const location = formatReportLocation({
    buildingName,
    unitNumber,
    unitLabel,
    locationDetail: report.location_detail,
  });
  const police = agencies.find((row) => row.kind === "police");
  const fire = agencies.find((row) => row.kind === "fire");
  const ems = agencies.find((row) => row.kind === "fire_rescue");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <WindowFrame
        title={`${report.report_number}`}
        trailing={
          <div className="flex items-center gap-2">
            <a
              href={`/api/reports/${report.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              View PDF
            </a>
            <ExportReportButton
              reportId={report.id}
              reportNumber={report.report_number}
            />
            <ReportStatusBadge status={report.status} />
          </div>
        }
      >
        <dl>
          <Field label="Incident" value={incidentLabel} />
          <Field label="When" value={formatReportWhen(report.occurred_at)} />
          <Field label="Location" value={location} />
          <Field
            label="Police"
            value={
              police?.involved
                ? [police.department, police.responder_id, police.case_number]
                    .filter(Boolean)
                    .join(" · ") || "Yes"
                : "No"
            }
          />
          <Field
            label="Fire"
            value={
              fire?.involved
                ? [fire.department, fire.responder_id].filter(Boolean).join(" · ") ||
                  "Yes"
                : "No"
            }
          />
          <Field
            label="EMS"
            value={
              ems?.involved
                ? [ems.department, ems.responder_name, ems.responder_id]
                    .filter(Boolean)
                    .join(" · ") || "Yes"
                : "No"
            }
          />
          <Field
            label="Injury"
            value={
              people[0]
                ? [
                    people[0].injured_party_type,
                    people[0].transported_to_hospital ? "transported" : null,
                    people[0].injury_description,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "None reported"
            }
          />
          <Field
            label="Vehicles"
            value={
              vehicles.length
                ? vehicles
                    .map((row) =>
                      [row.color, row.make_model, row.license_plate]
                        .filter(Boolean)
                        .join(" ")
                    )
                    .join("; ")
                : "None"
            }
          />
          <Field
            label="Damage"
            value={
              damage?.has_damage
                ? [damage.damage_type, damage.description].filter(Boolean).join(" · ")
                : "None"
            }
          />
          <Field label="Writer" value={report.writer_name} />
        </dl>
      </WindowFrame>

      {report.original_summary && (
        <WindowFrame title="Incident details">
          <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed">
            {report.original_summary}
          </p>
        </WindowFrame>
      )}

      {media.length > 0 && (
        <WindowFrame title="Attachments">
          <div className="px-4 py-4">
            <MediaAttach
              orgId={orgId}
              reportId={report.id}
              userId={userId}
              videoSeconds={videoSeconds}
              initialItems={media}
              readOnly
            />
          </div>
        </WindowFrame>
      )}

      {report.status === "finalized" && (
        <AmendmentsPanel
          reportId={report.id}
          amendments={amendments}
          canAmend={canAmend}
        />
      )}

      {canDelete && (
        <WindowFrame title="Delete">
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Deleting removes this report and its attachments. This cannot be
              undone.
            </p>
            <DeleteReportButton
              reportId={report.id}
              reportNumber={report.report_number}
              status={report.status}
            />
          </div>
        </WindowFrame>
      )}
    </div>
  );
}
