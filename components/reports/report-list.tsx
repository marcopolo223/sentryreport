"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { deleteReports } from "@/app/actions/reports";
import { NewReportButton } from "@/components/reports/new-report-button";
import { ExportSelectedButton } from "@/components/reports/export-button";
import { ReportStatusBadge } from "@/components/reports/status-badge";
import { Button } from "@/components/ui/button";
import { formatReportLocation, formatReportWhen } from "@/lib/reports";
import type { ReportStatus } from "@/lib/supabase/types";

export type ReportListRow = {
  id: string;
  report_number: string;
  status: ReportStatus;
  location_detail: string | null;
  occurred_at: string | null;
  created_at: string;
  incidentLabel: string;
  buildingName: string | null;
  unitNumber: string | null;
  unitLabel: string | null;
};

export function ReportList({
  rows,
  isAdmin,
  queue,
}: {
  rows: ReportListRow[];
  isAdmin: boolean;
  queue: ReportStatus;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [queue]);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((row) => row.id)));
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 px-4 py-10">
        <div>
          <p className="text-sm font-medium text-foreground">
            No {queue} reports
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {queue === "draft"
              ? "Start a draft to get a case number, then walk through the intake one step at a time."
              : queue === "submitted"
                ? "Submitted reports land here for review and finalize."
                : "Finalized reports stay locked here, with amendments added on the report."}
          </p>
        </div>
        {queue === "draft" && <NewReportButton />}
      </div>
    );
  }

  const list = (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {isAdmin && (
          <label className="flex size-4 items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded border-input"
              aria-label="Select all"
            />
          </label>
        )}
        <span className="flex-1">Incident</span>
        <span className="shrink-0">Status</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const location = formatReportLocation({
            buildingName: row.buildingName,
            unitNumber: row.unitNumber,
            unitLabel: row.unitLabel,
            locationDetail: row.location_detail,
          });
          const when = formatReportWhen(row.occurred_at ?? row.created_at);
          const checked = selected.has(row.id);

          return (
            <li key={row.id} className="flex min-w-0 items-start gap-3 px-4 py-3">
              {isAdmin && (
                <label className="flex size-4 shrink-0 items-center justify-center pt-0.5">
                  <input
                    type="checkbox"
                    name="reportId"
                    value={row.id}
                    checked={checked}
                    onChange={() => toggle(row.id)}
                    className="size-4 rounded border-input"
                    aria-label={`Select ${row.report_number}`}
                  />
                </label>
              )}
              <Link
                href={`/reports/${row.id}`}
                className="flex min-w-0 flex-1 items-start gap-3 transition-[opacity] duration-200 hover:opacity-80"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">
                    {row.incidentLabel}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {row.report_number}
                    {when ? ` · ${when}` : ""}
                  </p>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">
                    {location}
                  </p>
                </div>
                <div className="shrink-0 pt-0.5">
                  <ReportStatusBadge status={row.status} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  if (!isAdmin) return list;

  return (
    <form
      action={deleteReports}
      onSubmit={(event) => {
        if (selected.size === 0) {
          event.preventDefault();
          return;
        }
        if (
          !window.confirm(
            `Delete ${selected.size} report${selected.size === 1 ? "" : "s"}? This cannot be undone.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <ExportSelectedButton ids={Array.from(selected)} />
            <Button type="submit" size="sm" variant="destructive">
              Delete selected
            </Button>
          </div>
        </div>
      )}
      {list}
    </form>
  );
}
