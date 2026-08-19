import type { SupabaseClient } from "@supabase/supabase-js";

import {
  conditionValueMatches,
  formatAnswerForDisplay,
  stringifyAnswer,
} from "@/lib/questions";
import type { PdfLayout } from "@/lib/pdf/types";
import { parsePdfLayout } from "@/lib/pdf/types";
import { extensionForType } from "@/lib/media";
import type {
  Database,
  Json,
  Tables,
} from "@/lib/supabase/types";

export type PdfQuestion = Tables<"org_questions"> & {
  options: Tables<"org_question_options">[];
  conditions: Tables<"org_question_conditions">[];
};

export type PdfVehicle = {
  color: string | null;
  make_model: string | null;
  license_plate: string | null;
  driver_name: string | null;
};

export type PdfPhoto = {
  dataUri: string;
  filename: string;
};

export type PdfVideoFile = {
  filename: string;
  bytes: Uint8Array;
};

export type PdfAmendment = {
  body: string;
  createdAt: string;
  authorName: string;
};

export type PdfBundle = {
  report: Tables<"reports">;
  orgName: string;
  agencyName: string | null;
  branding: boolean;
  logoDataUri: string | null;
  bannerDataUri: string | null;
  questions: PdfQuestion[];
  visibleQuestions: PdfQuestion[];
  valuesByKey: Record<string, Json | null>;
  displayByKey: Record<string, string>;
  vehicles: PdfVehicle[];
  photos: PdfPhoto[];
  videos: PdfVideoFile[];
  officerSignature: string | null;
  adminSignature: string | null;
  amendments: PdfAmendment[];
  layout: PdfLayout | null;
};

function jsonFromUnknown(value: unknown): Json | null {
  if (value == null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value as Json;
  if (typeof value === "object") return value as Json;
  return stringifyAnswer(value as Json);
}

async function toDataUri(
  bytes: ArrayBuffer | Uint8Array,
  contentType: string | null
) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const type = contentType || "application/octet-stream";
  if (typeof Buffer !== "undefined") {
    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  }
  let binary = "";
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${type};base64,${btoa(binary)}`;
}

async function fetchAsDataUri(url: string | null | undefined) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) return null;
    return toDataUri(await response.arrayBuffer(), type);
  } catch {
    return null;
  }
}

async function downloadStorageDataUri(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string | null | undefined,
  contentType?: string | null
) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return toDataUri(await data.arrayBuffer(), contentType || data.type || "image/png");
}

async function downloadStorageBytes(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string
) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

function relationalValues(input: {
  report: Tables<"reports">;
  incidentSlug: string | null;
  incidentLabel: string | null;
  buildingId: string | null;
  buildingName: string | null;
  unitId: string | null;
  unitLabel: string | null;
  agencies: Tables<"report_agencies">[];
  people: Tables<"report_people">[];
  damage: Tables<"report_property_damage"> | null;
  vehicles: PdfVehicle[];
}): Record<string, Json | null> {
  const police = input.agencies.find((row) => row.kind === "police");
  const fire = input.agencies.find((row) => row.kind === "fire");
  const ems = input.agencies.find((row) => row.kind === "fire_rescue");
  const person = input.people[0];

  return {
    incident_type: input.incidentSlug,
    building: input.buildingId,
    unit: input.unitId,
    occurred_at: input.report.occurred_at,
    location_detail: input.report.location_detail,
    police_called: police?.involved ?? false,
    police_department: police?.department ?? null,
    police_badge: police?.responder_id ?? null,
    police_case_number: police?.case_number ?? null,
    fire_called: fire?.involved ?? false,
    fire_department: fire?.department ?? null,
    fire_unit: fire?.responder_id ?? null,
    ems_called: ems?.involved ?? false,
    ems_department: ems?.department ?? null,
    ems_responder_id: ems?.responder_id ?? null,
    ems_responder_name: ems?.responder_name ?? null,
    anyone_injured: Boolean(person),
    injured_party_type: person?.injured_party_type ?? null,
    transported_to_hospital: person?.transported_to_hospital ?? false,
    injury_description: person?.injury_description ?? null,
    vehicles_involved: input.vehicles.length > 0,
    has_property_damage: input.damage?.has_damage ?? false,
    damage_type: input.damage?.damage_type ?? null,
    damage_description: input.damage?.description ?? null,
    estimated_cost: input.damage?.estimated_cost ?? null,
    original_summary:
      input.report.final_narrative ?? input.report.original_summary,
    __writer_name: input.report.writer_name,
    __property_address: input.report.property_address,
    __report_number: input.report.report_number,
    __org_name: null,
  };
}

function displayOverrides(input: {
  incidentLabel: string | null;
  buildingName: string | null;
  unitLabel: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (input.incidentLabel) out.incident_type = input.incidentLabel;
  if (input.buildingName) out.building = input.buildingName;
  if (input.unitLabel) out.unit = input.unitLabel;
  return out;
}

function isVisible(
  question: PdfQuestion,
  valueById: Record<string, Json | null>
) {
  if (question.conditions.length === 0) return true;
  return question.conditions.every((condition) =>
    conditionValueMatches(
      valueById[condition.depends_on_question_id],
      condition.expected_value
    )
  );
}

export async function loadPdfBundle(
  supabase: SupabaseClient<Database>,
  orgId: string,
  reportId: string,
  options: { branding: boolean; useCustomTemplate: boolean }
): Promise<PdfBundle | null> {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!report) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("name, agency_name, logo_url, banner_url")
    .eq("id", orgId)
    .maybeSingle();

  const [
    questionsRes,
    optionsRes,
    conditionsRes,
    answersRes,
    agenciesRes,
    vehiclesRes,
    peopleRes,
    damageRes,
    mediaRes,
    amendmentsRes,
    incidentTypesRes,
    buildingsRes,
    unitsRes,
    templateRes,
  ] = await Promise.all([
    supabase
      .from("org_questions")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("org_question_options")
      .select("*")
      .eq("organization_id", orgId)
      .order("sort_order"),
    supabase
      .from("org_question_conditions")
      .select("*")
      .eq("organization_id", orgId),
    supabase.from("report_answers").select("*").eq("report_id", report.id),
    supabase.from("report_agencies").select("*").eq("report_id", report.id),
    supabase
      .from("report_vehicles")
      .select("*")
      .eq("report_id", report.id)
      .order("sort_order"),
    supabase.from("report_people").select("*").eq("report_id", report.id),
    supabase
      .from("report_property_damage")
      .select("*")
      .eq("report_id", report.id)
      .maybeSingle(),
    supabase
      .from("report_media")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at"),
    supabase
      .from("report_amendments")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at"),
    supabase
      .from("org_incident_types")
      .select("id, slug, label")
      .eq("organization_id", orgId),
    supabase
      .from("buildings")
      .select("id, name")
      .eq("organization_id", orgId),
    supabase
      .from("building_units")
      .select("id, unit_number, label")
      .eq("organization_id", orgId),
    options.useCustomTemplate
      ? supabase
          .from("pdf_templates")
          .select("layout")
          .eq("organization_id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const incident = (incidentTypesRes.data ?? []).find(
    (row) => row.id === report.incident_type_id
  );
  const building = (buildingsRes.data ?? []).find(
    (row) => row.id === report.building_id
  );
  const unit = (unitsRes.data ?? []).find((row) => row.id === report.unit_id);
  const unitLabel = unit?.label || unit?.unit_number || null;
  const vehicles = (vehiclesRes.data ?? []).map((row) => ({
    color: row.color,
    make_model: row.make_model,
    license_plate: row.license_plate,
    driver_name: row.driver_name,
  }));

  const questions: PdfQuestion[] = (questionsRes.data ?? []).map((question) => ({
    ...question,
    options: (optionsRes.data ?? []).filter(
      (option) => option.question_id === question.id
    ),
    conditions: (conditionsRes.data ?? []).filter(
      (condition) => condition.question_id === question.id
    ),
  }));

  const valuesByKey = relationalValues({
    report,
    incidentSlug: incident?.slug ?? null,
    incidentLabel: incident?.label ?? null,
    buildingId: report.building_id,
    buildingName: building?.name ?? null,
    unitId: report.unit_id,
    unitLabel,
    agencies: agenciesRes.data ?? [],
    people: peopleRes.data ?? [],
    damage: damageRes.data ?? null,
    vehicles,
  });
  valuesByKey.__org_name = org?.name ?? null;

  for (const answer of answersRes.data ?? []) {
    const question = questions.find((item) => item.id === answer.question_id);
    if (!question || question.is_default) continue;
    valuesByKey[question.question_key] = jsonFromUnknown(answer.value);
  }

  const valueById: Record<string, Json | null> = {};
  for (const question of questions) {
    valueById[question.id] = valuesByKey[question.question_key] ?? null;
  }

  const visibleQuestions = questions.filter((question) =>
    isVisible(question, valueById)
  );

  const displayByKey: Record<string, string> = {
    ...displayOverrides({
      incidentLabel: incident?.label ?? null,
      buildingName: building?.name ?? null,
      unitLabel,
    }),
  };
  for (const question of questions) {
    if (displayByKey[question.question_key]) continue;
    const value = valuesByKey[question.question_key];
    const option = question.options.find(
      (item) => item.value === stringifyAnswer(value)
    );
    displayByKey[question.question_key] = option
      ? option.label
      : formatAnswerForDisplay(value);
  }
  displayByKey.__writer_name = formatAnswerForDisplay(report.writer_name);
  displayByKey.__property_address = formatAnswerForDisplay(
    report.property_address
  );
  displayByKey.__report_number = report.report_number;
  displayByKey.__org_name = org?.name ?? "";

  const photos: PdfPhoto[] = [];
  const videos: PdfVideoFile[] = [];
  let photoIndex = 0;
  let videoIndex = 0;
  for (const item of mediaRes.data ?? []) {
    if (item.kind === "photo") {
      if (photos.length >= 12) continue;
      const dataUri = await downloadStorageDataUri(
        supabase,
        "report-media",
        item.storage_path,
        item.content_type
      );
      if (!dataUri) continue;
      photoIndex += 1;
      photos.push({
        dataUri,
        filename: `photo-${photoIndex}.${extensionForType(item.content_type ?? "image/jpeg", "photo")}`,
      });
      continue;
    }
    const bytes = await downloadStorageBytes(
      supabase,
      "report-media",
      item.storage_path
    );
    if (!bytes) continue;
    videoIndex += 1;
    videos.push({
      filename: `video-${videoIndex}.${extensionForType(item.content_type ?? "video/mp4", "video")}`,
      bytes,
    });
  }

  const amendmentAuthorIds = Array.from(
    new Set((amendmentsRes.data ?? []).map((row) => row.created_by))
  );
  const { data: authors } =
    amendmentAuthorIds.length > 0
      ? await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", amendmentAuthorIds)
      : { data: [] };
  const authorNames = new Map(
    (authors ?? []).map((person) => [
      person.id,
      person.full_name || person.email || "Someone",
    ])
  );

  const [logoDataUri, bannerDataUri, officerSignature, adminSignature] =
    await Promise.all([
      options.branding ? fetchAsDataUri(org?.logo_url) : Promise.resolve(null),
      options.branding ? fetchAsDataUri(org?.banner_url) : Promise.resolve(null),
      downloadStorageDataUri(
        supabase,
        "report-media",
        report.officer_signature_path,
        "image/png"
      ),
      downloadStorageDataUri(
        supabase,
        "report-media",
        report.admin_signature_path,
        "image/png"
      ),
    ]);

  return {
    report,
    orgName: org?.name ?? "Organization",
    agencyName: org?.agency_name ?? null,
    branding: options.branding,
    logoDataUri,
    bannerDataUri,
    questions,
    visibleQuestions,
    valuesByKey,
    displayByKey,
    vehicles,
    photos,
    videos,
    officerSignature,
    adminSignature,
    amendments: (amendmentsRes.data ?? []).map((row) => ({
      body: row.body,
      createdAt: row.created_at,
      authorName: authorNames.get(row.created_by) ?? "Someone",
    })),
    layout: options.useCustomTemplate
      ? parsePdfLayout(templateRes.data?.layout ?? null)
      : null,
  };
}
