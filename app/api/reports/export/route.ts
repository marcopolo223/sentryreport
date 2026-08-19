import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import { loadPdfBundle, type PdfBundle } from "@/lib/pdf/bundle";
import { renderReportPdf, zipBulkReportExport } from "@/lib/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BULK = 40;

export async function POST(request: Request) {
  const { supabase, membership } = await requireAdmin();
  const orgId = membership.organization_id;
  const { limits } = await loadEffectivePlan(
    supabase,
    orgId,
    membership.organizations?.plan_id
  );

  let ids: string[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  ids = Array.from(new Set(ids)).slice(0, MAX_BULK);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one report." }, { status: 400 });
  }

  const items: { folder: string; pdf: Buffer; videos: PdfBundle["videos"] }[] = [];

  for (const id of ids) {
    const bundle = await loadPdfBundle(supabase, orgId, id, {
      branding: limits.branding,
      useCustomTemplate: limits.builders,
    });
    if (!bundle) continue;
    const pdf = await renderReportPdf(bundle);
    items.push({
      folder: bundle.report.report_number,
      pdf,
      videos: bundle.videos,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "No reports could be exported." }, { status: 404 });
  }

  const zip = await zipBulkReportExport(items);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="reports-export.zip"`,
    },
  });
}
