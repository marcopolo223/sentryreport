import { addReportAmendment } from "@/app/actions/reports";
import { WindowFrame } from "@/components/reports/window-frame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatReportWhen } from "@/lib/reports";
import type { Tables } from "@/lib/supabase/types";

type AmendmentRow = Tables<"report_amendments"> & {
  authorName: string;
};

export function AmendmentsPanel({
  reportId,
  amendments,
  canAmend,
}: {
  reportId: string;
  amendments: AmendmentRow[];
  canAmend: boolean;
}) {
  return (
    <WindowFrame title="Amendments">
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          This report is locked. Amendments are added below and do not change
          the original finalized content.
        </p>

        {amendments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No amendments yet.</p>
        ) : (
          <ul className="space-y-3">
            {amendments.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-border px-3 py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {row.authorName}
                  {row.created_at ? ` · ${formatReportWhen(row.created_at)}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {row.body}
                </p>
              </li>
            ))}
          </ul>
        )}

        {canAmend && (
          <form action={addReportAmendment} className="space-y-3">
            <input type="hidden" name="reportId" value={reportId} />
            <Textarea
              name="body"
              required
              minLength={1}
              placeholder="Add a correction or note"
            />
            <Button type="submit">Add amendment</Button>
          </form>
        )}
      </div>
    </WindowFrame>
  );
}
