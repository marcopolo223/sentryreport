"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import {
  hasDependencyCycle,
  slugifyIncidentType,
  slugifyQuestionKey,
  type QuestionConditionEdge,
} from "@/lib/questions";
import type {
  FormSection,
  QuestionFieldType,
} from "@/lib/supabase/types";

function intakeError(message: string): never {
  redirect(`/admin/configuration/intake?error=${encodeURIComponent(message)}`);
}

async function requireBuilders() {
  const { supabase, user, membership } = await requireAdmin();
  const { limits } = await loadEffectivePlan(
    supabase,
    membership.organization_id,
    membership.organizations?.plan_id
  );
  if (!limits.builders) {
    intakeError("Question builder is on Standard and Pro.");
  }
  return { supabase, user, membership };
}

async function loadConditionEdges(
  supabase: Awaited<ReturnType<typeof requireBuilders>>["supabase"],
  orgId: string
): Promise<QuestionConditionEdge[]> {
  const { data } = await supabase
    .from("org_question_conditions")
    .select("question_id, depends_on_question_id")
    .eq("organization_id", orgId);
  return (data ?? []).map((row) => ({
    questionId: row.question_id,
    dependsOnQuestionId: row.depends_on_question_id,
  }));
}

async function syncIncidentTypeOptions(
  supabase: Awaited<ReturnType<typeof requireBuilders>>["supabase"],
  orgId: string
) {
  const { data: question } = await supabase
    .from("org_questions")
    .select("id")
    .eq("organization_id", orgId)
    .eq("question_key", "incident_type")
    .eq("is_active", true)
    .maybeSingle();
  if (!question) return;

  const { data: types } = await supabase
    .from("org_incident_types")
    .select("slug, label, sort_order")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order");

  await supabase.from("org_question_options").delete().eq("question_id", question.id);
  if (types && types.length > 0) {
    const { error } = await supabase.from("org_question_options").insert(
      types.map((row) => ({
        question_id: question.id,
        organization_id: orgId,
        value: row.slug,
        label: row.label,
        sort_order: row.sort_order,
      }))
    );
    if (error) intakeError(error.message);
  }
}

function optionRows(options: { value?: string; label: string }[]) {
  return options
    .map((option, index) => {
      const label = option.label.trim();
      if (!label) return null;
      const value =
        option.value?.trim() ||
        label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      return { value, label, sort_order: index };
    })
    .filter((row): row is { value: string; label: string; sort_order: number } =>
      Boolean(row)
    );
}

export async function addIncidentType(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const orgId = membership.organization_id;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) intakeError("Enter an incident type.");

  const { data: existing } = await supabase
    .from("org_incident_types")
    .select("sort_order")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let slug = slugifyIncidentType(label);
  const { data: clash } = await supabase
    .from("org_incident_types")
    .select("id")
    .eq("organization_id", orgId)
    .eq("slug", slug)
    .maybeSingle();
  if (clash) slug = `${slug}_${crypto.randomUUID().slice(0, 4)}`;

  const { error } = await supabase.from("org_incident_types").insert({
    organization_id: orgId,
    slug,
    label,
    sort_order: (existing?.sort_order ?? 0) + 1,
  });
  if (error) intakeError(error.message);
  await syncIncidentTypeOptions(supabase, orgId);
  revalidatePath("/admin/configuration/intake");
}

export async function updateIncidentType(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id || !label) intakeError("Incident type needs a label.");
  const { error } = await supabase
    .from("org_incident_types")
    .update({ label })
    .eq("id", id)
    .eq("organization_id", membership.organization_id);
  if (error) intakeError(error.message);
  await syncIncidentTypeOptions(supabase, membership.organization_id);
  revalidatePath("/admin/configuration/intake");
}

export async function deactivateIncidentType(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("org_incident_types")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", membership.organization_id);
  if (error) intakeError(error.message);
  await syncIncidentTypeOptions(supabase, membership.organization_id);
  revalidatePath("/admin/configuration/intake");
}

export async function addQuestion(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const orgId = membership.organization_id;
  const section = String(formData.get("section") ?? "") as FormSection;
  const label = String(formData.get("label") ?? "").trim();
  const fieldType = String(formData.get("fieldType") ?? "text") as QuestionFieldType;
  const required = formData.get("required") === "on";
  if (!label) intakeError("Enter a question label.");

  const { data: last } = await supabase
    .from("org_questions")
    .select("display_order")
    .eq("organization_id", orgId)
    .eq("section", section)
    .eq("is_active", true)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("org_questions")
    .insert({
      organization_id: orgId,
      question_key: slugifyQuestionKey(label),
      section,
      label,
      field_type: fieldType,
      required,
      is_default: false,
      display_order: (last?.display_order ?? 0) + 10,
      version: 1,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !created) intakeError(error?.message ?? "Could not add question.");

  if (fieldType === "dropdown" || fieldType === "multi_select") {
    const raw = String(formData.get("options") ?? "");
    const rows = optionRows(
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ label: line }))
    );
    if (rows.length > 0) {
      const { error: optionError } = await supabase.from("org_question_options").insert(
        rows.map((row) => ({
          question_id: created.id,
          organization_id: orgId,
          value: row.value,
          label: row.label,
          sort_order: row.sort_order,
        }))
      );
      if (optionError) intakeError(optionError.message);
    }
  }

  revalidatePath("/admin/configuration/intake");
  revalidatePath("/reports");
}

export async function saveQuestion(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const orgId = membership.organization_id;
  const questionId = String(formData.get("questionId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const required = formData.get("required") === "on";
  const fieldType = String(formData.get("fieldType") ?? "text") as QuestionFieldType;
  const dependsOn = String(formData.get("dependsOn") ?? "").trim();
  const expectedValue = String(formData.get("expectedValue") ?? "").trim();
  const optionsText = String(formData.get("options") ?? "");

  const { data: question } = await supabase
    .from("org_questions")
    .select("*")
    .eq("id", questionId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!question) intakeError("Question not found.");

  const nextType = question.is_default ? question.field_type : fieldType;
  const nextOptions = optionRows(
    optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ label: line }))
  );

  const { data: currentOptions } = await supabase
    .from("org_question_options")
    .select("value, label, sort_order")
    .eq("question_id", question.id)
    .order("sort_order");

  const optionsChanged =
    JSON.stringify((currentOptions ?? []).map((row) => [row.value, row.label])) !==
    JSON.stringify(nextOptions.map((row) => [row.value, row.label]));
  const typeChanged = nextType !== question.field_type;
  const shouldVersion = !question.is_default && (typeChanged || optionsChanged);

  let liveId = question.id;

  if (shouldVersion) {
    const { error: deactivateError } = await supabase
      .from("org_questions")
      .update({ is_active: false })
      .eq("id", question.id);
    if (deactivateError) intakeError(deactivateError.message);

    const { data: created, error } = await supabase
      .from("org_questions")
      .insert({
        organization_id: orgId,
        question_key: question.question_key,
        section: question.section,
        label: label || question.label,
        field_type: nextType,
        required,
        is_default: false,
        display_order: question.display_order,
        version: question.version + 1,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !created) {
      await supabase
        .from("org_questions")
        .update({ is_active: true })
        .eq("id", question.id);
      intakeError(error?.message ?? "Could not version question.");
    }
    liveId = created.id;

    if (nextOptions.length > 0) {
      const { error: optionError } = await supabase.from("org_question_options").insert(
        nextOptions.map((row) => ({
          question_id: liveId,
          organization_id: orgId,
          value: row.value,
          label: row.label,
          sort_order: row.sort_order,
        }))
      );
      if (optionError) intakeError(optionError.message);
    }

    await supabase
      .from("org_question_conditions")
      .update({ depends_on_question_id: liveId })
      .eq("organization_id", orgId)
      .eq("depends_on_question_id", question.id);
  } else {
    const { error } = await supabase
      .from("org_questions")
      .update({ label: label || question.label, required })
      .eq("id", question.id);
    if (error) intakeError(error.message);
  }

  const edges = await loadConditionEdges(supabase, orgId);
  const withoutCurrent = edges.filter((edge) => edge.questionId !== liveId && edge.questionId !== question.id);
  if (dependsOn) {
    if (
      hasDependencyCycle(withoutCurrent, {
        questionId: liveId,
        dependsOnQuestionId: dependsOn,
      })
    ) {
      intakeError("That condition would create a cycle.");
    }
    await supabase
      .from("org_question_conditions")
      .delete()
      .eq("question_id", question.id);
    await supabase
      .from("org_question_conditions")
      .delete()
      .eq("question_id", liveId);
    const { error } = await supabase.from("org_question_conditions").insert({
      question_id: liveId,
      organization_id: orgId,
      depends_on_question_id: dependsOn,
      expected_value: expectedValue || "true",
    });
    if (error) intakeError(error.message);
  } else {
    await supabase.from("org_question_conditions").delete().eq("question_id", question.id);
    await supabase.from("org_question_conditions").delete().eq("question_id", liveId);
  }

  revalidatePath("/admin/configuration/intake");
  revalidatePath("/reports");
}

export async function deactivateQuestion(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const id = String(formData.get("questionId") ?? "");
  const { data: question } = await supabase
    .from("org_questions")
    .select("is_default")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!question) intakeError("Question not found.");
  if (question.is_default) intakeError("Default questions cannot be removed.");

  const { error } = await supabase
    .from("org_questions")
    .update({ is_active: false })
    .eq("id", id);
  if (error) intakeError(error.message);
  revalidatePath("/admin/configuration/intake");
  revalidatePath("/reports");
}

export async function moveQuestion(formData: FormData) {
  const { supabase, membership } = await requireBuilders();
  const orgId = membership.organization_id;
  const id = String(formData.get("questionId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const { data: question } = await supabase
    .from("org_questions")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!question) intakeError("Question not found.");

  const { data: siblings } = await supabase
    .from("org_questions")
    .select("id, display_order")
    .eq("organization_id", orgId)
    .eq("section", question.section)
    .eq("is_active", true)
    .order("display_order");
  const list = siblings ?? [];
  const index = list.findIndex((row) => row.id === id);
  const swapWith = direction === "up" ? list[index - 1] : list[index + 1];
  if (!swapWith) return;

  await supabase
    .from("org_questions")
    .update({ display_order: swapWith.display_order })
    .eq("id", question.id);
  await supabase
    .from("org_questions")
    .update({ display_order: question.display_order })
    .eq("id", swapWith.id);

  revalidatePath("/admin/configuration/intake");
}
