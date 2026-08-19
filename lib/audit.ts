import type { Json } from "@/lib/supabase/types";

export function formatAuditAction(action: string): string {
  switch (action) {
    case "organization.created":
      return "Created this organization";
    case "organization.join_code_regenerated":
      return "Regenerated the join code";
    case "membership.requested":
      return "Requested to join";
    case "membership.approved":
      return "Approved a member";
    case "membership.rejected":
      return "Rejected a join request";
    case "membership.removed":
      return "Removed a member";
    case "membership.role_changed":
      return "Changed a member role";
    case "report.created":
      return "Created a report";
    case "report.submitted":
      return "Submitted a report";
    case "report.finalized":
      return "Finalized a report";
    case "report.discarded":
      return "Discarded a draft";
    case "report.deleted":
      return "Deleted a report";
    case "report.amended":
      return "Added an amendment";
    case "billing.plan_changed":
      return "Changed the billing plan";
    case "billing.status_changed":
      return "Updated billing status";
    case "billing.checkout_started":
      return "Started checkout";
    case "intake.question_changed":
      return "Updated intake questions";
    case "pdf.template_saved":
      return "Saved a PDF template";
    default:
      return action.replace(/\./g, " ");
  }
}

export function auditReportNumber(
  previousValue: Json | null,
  newValue: Json | null
): string | null {
  const fromNew = jsonString(newValue, "report_number");
  if (fromNew) return fromNew;
  return jsonString(previousValue, "report_number");
}

function jsonString(value: Json | null, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const found = value[key];
  return typeof found === "string" && found.length > 0 ? found : null;
}
