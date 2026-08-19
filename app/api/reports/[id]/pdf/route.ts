import { NextResponse } from "next/server";

import { requireMember } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import { loadPdfBundle } from "@/lib/pdf/bundle";
import { renderReportPdf } from "@/lib/pdf/render";
import { isAdminRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user, membership } = await requireMember();
  const orgId = membership.organization_id;
  const admin = isAdminRole(membership.role);
  const officerCanView =
    membership.organizations?.officer_can_view_own_reports ?? true;
  const { limits } = await loadEffectivePlan(
    supabase,
    orgId,
    membership.organizations?.plan_id
  );

  const { data: report } = await supabase
    .from("reports")
    .select("id, created_by, status, report_number")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const own =
    report.created_by === user.id &&
    (report.status === "draft" || officerCanView);
  if (!admin && !own) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const bundle = await loadPdfBundle(supabase, orgId, report.id, {
    branding: limits.branding,
    useCustomTemplate: limits.builders,
  });
  if (!bundle) {
    return NextResponse.json({ error: "Could not load report." }, { status: 404 });
  }

  const pdf = await renderReportPdf(bundle);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bundle.report.report_number}.pdf"`,
    },
  });
}
