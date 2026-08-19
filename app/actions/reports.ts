"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

function reportsError(message: string): never {
  redirect(`/reports?error=${encodeURIComponent(message)}`);
}

export async function createDraftReport() {
  const { supabase, membership } = await requireMember();
  const { data, error } = await supabase.rpc("create_draft_report", {
    org_id: membership.organization_id,
  });

  if (error || !data) {
    reportsError(error?.message ?? "Could not start a report.");
  }

  revalidatePath("/reports");
  revalidatePath("/home");
  revalidatePath("/admin/team");
  redirect(`/reports/${data.id}`);
}

export async function submitReport(reportId: string, signaturePath: string) {
  const { supabase, membership } = await requireMember();
  const { error } = await supabase.rpc("submit_report", {
    target_report_id: reportId,
    signature_path: signaturePath,
  });

  if (error) {
    redirect(
      `/reports/${reportId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/home");
  revalidatePath("/admin/team");
  redirect(
    isAdminRole(membership.role) ? `/reports/${reportId}` : "/reports"
  );
}

export async function finalizeReport(reportId: string, signaturePath: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("finalize_report", {
    target_report_id: reportId,
    signature_path: signaturePath,
  });

  if (error) {
    redirect(
      `/reports/${reportId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/home");
  revalidatePath("/admin/team");
  redirect(`/reports/${reportId}`);
}

export async function discardDraftReport(reportId: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("discard_draft_report", {
    target_report_id: reportId,
  });

  if (error) {
    reportsError(error.message);
  }

  revalidatePath("/reports");
  revalidatePath("/home");
  redirect("/reports");
}

async function removeReportMedia(
  supabase: Awaited<ReturnType<typeof requireMember>>["supabase"],
  reportIds: string[]
) {
  if (reportIds.length === 0) return;
  const { data } = await supabase
    .from("report_media")
    .select("storage_path")
    .in("report_id", reportIds);
  const paths = (data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  const { error } = await supabase.rpc("delete_reports", {
    target_ids: reportIds,
  });
  if (error) throw error;

  if (paths.length > 0) {
    await supabase.storage.from("report-media").remove(paths);
  }
}

export async function deleteReport(reportId: string) {
  const { supabase } = await requireMember();
  try {
    await removeReportMedia(supabase, [reportId]);
  } catch (error) {
    reportsError(error instanceof Error ? error.message : "Could not delete the report.");
  }

  revalidatePath("/reports");
  revalidatePath("/home");
  revalidatePath("/admin/team");
  revalidatePath("/admin/settings");
  redirect("/reports");
}

export async function deleteReports(formData: FormData) {
  const { supabase, membership } = await requireMember();
  if (!isAdminRole(membership.role)) {
    reportsError("Only an admin or owner can delete reports in bulk.");
  }

  const ids = formData
    .getAll("reportId")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (ids.length === 0) {
    reportsError("Select at least one report.");
  }

  try {
    await removeReportMedia(supabase, ids);
  } catch (error) {
    reportsError(error instanceof Error ? error.message : "Could not delete reports.");
  }

  revalidatePath("/reports");
  revalidatePath("/home");
  revalidatePath("/admin/team");
  revalidatePath("/admin/settings");
  redirect("/reports");
}

export async function addReportAmendment(formData: FormData) {
  const { supabase, membership } = await requireMember();
  if (!isAdminRole(membership.role)) {
    reportsError("Only an admin or owner can add an amendment.");
  }

  const reportId = String(formData.get("reportId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!reportId || !body) {
    redirect(
      `/reports/${reportId || ""}?error=${encodeURIComponent("Amendment text is required.")}`
    );
  }

  const { error } = await supabase.rpc("add_report_amendment", {
    target_report_id: reportId,
    amendment_body: body,
  });

  if (error) {
    redirect(`/reports/${reportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/home");
  revalidatePath("/admin/team");
  redirect(`/reports/${reportId}`);
}
