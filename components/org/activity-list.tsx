import Link from "next/link";

import { auditReportNumber, formatAuditAction } from "@/lib/audit";
import { formatReportWhen } from "@/lib/reports";
import type { Tables } from "@/lib/supabase/types";

export type ActivityPerson = {
  id: string;
  full_name: string | null;
  email: string;
};

export function ActivityList({
  events,
  people,
  empty = "No activity yet.",
}: {
  events: Tables<"audit_log">[];
  people: ActivityPerson[];
  empty?: string;
}) {
  const names = new Map(
    people.map((person) => [
      person.id,
      person.full_name || person.email || "Someone",
    ])
  );

  if (events.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => {
        const number = auditReportNumber(event.previous_value, event.new_value);
        const href = event.report_id ? `/reports/${event.report_id}` : null;
        return (
          <li key={event.id} className="px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {formatAuditAction(event.action)}
              {number ? ` · ${number}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {event.user_id ? names.get(event.user_id) ?? "Someone" : "System"}
              {event.created_at ? ` · ${formatReportWhen(event.created_at)}` : ""}
            </p>
            {href && (
              <Link
                href={href}
                className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open report
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
