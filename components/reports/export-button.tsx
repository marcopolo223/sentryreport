"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

async function downloadBlob(url: string, init: RequestInit | undefined, fallbackName: string) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Export failed.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const header = response.headers.get("Content-Disposition");
  const match = header?.match(/filename="([^"]+)"/);
  link.href = objectUrl;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ExportReportButton({
  reportId,
  reportNumber,
  variant = "outline",
  size = "sm",
  label = "Export ZIP",
}: {
  reportId: string;
  reportNumber: string;
  variant?: "outline" | "default" | "secondary";
  size?: "sm" | "default";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError("");
          void downloadBlob(
            `/api/reports/${reportId}/export`,
            undefined,
            `${reportNumber}.zip`
          )
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Export failed.");
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Exporting…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ExportSelectedButton({ ids }: { ids: string[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || ids.length === 0}
        onClick={() => {
          setBusy(true);
          setError("");
          void downloadBlob(
            "/api/reports/export",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids }),
            },
            "reports-export.zip"
          )
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Export failed.");
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Exporting…" : "Export selected"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
