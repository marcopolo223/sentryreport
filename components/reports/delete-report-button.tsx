"use client";

import { deleteReport } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";

export function DeleteReportButton({
  reportId,
  reportNumber,
  status,
}: {
  reportId: string;
  reportNumber: string;
  status: string;
}) {
  return (
    <form
      action={deleteReport.bind(null, reportId)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${reportNumber}? This ${status} report cannot be recovered.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        Delete report
      </Button>
    </form>
  );
}
