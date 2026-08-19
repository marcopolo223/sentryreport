"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import { parsePdfLayout, type PdfLayout } from "@/lib/pdf/types";
import type { Json } from "@/lib/supabase/types";

function templateError(message: string): never {
  redirect(`/admin/configuration/pdf-template?error=${encodeURIComponent(message)}`);
}

async function requireBuilders() {
  const { supabase, user, membership } = await requireAdmin();
  const { limits } = await loadEffectivePlan(
    supabase,
    membership.organization_id,
    membership.organizations?.plan_id
  );
  if (!limits.builders) {
    templateError("PDF template builder is on Standard and Pro.");
  }
  return { supabase, user, membership };
}

export async function savePdfTemplate(layout: PdfLayout) {
  const { supabase, user, membership } = await requireBuilders();
  const parsed = parsePdfLayout({ ...layout, version: 1 });
  if (!parsed) templateError("That layout could not be saved.");

  const { error } = await supabase.from("pdf_templates").upsert({
    organization_id: membership.organization_id,
    layout: parsed as unknown as Json,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) templateError(error.message);

  revalidatePath("/admin/configuration/pdf-template");
  revalidatePath("/reports");
}

export async function resetPdfTemplate() {
  const { supabase, membership } = await requireBuilders();
  const { error } = await supabase
    .from("pdf_templates")
    .delete()
    .eq("organization_id", membership.organization_id);
  if (error) templateError(error.message);
  revalidatePath("/admin/configuration/pdf-template");
  revalidatePath("/reports");
}
