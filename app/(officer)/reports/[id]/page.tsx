import { notFound, redirect } from "next/navigation";

import { IntakeWizard } from "@/components/intake/intake-wizard";
import { ReportView } from "@/components/reports/report-view";
import { Alert } from "@/components/ui/alert";
import { requireMember } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import { isAdminRole } from "@/lib/permissions";
import type { PlanId } from "@/lib/supabase/types";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; step?: string };
}) {
  const { supabase, user, membership } = await requireMember();
  const orgId = membership.organization_id;
  const admin = isAdminRole(membership.role);
  const planId = (membership.organizations?.plan_id ?? "free") as PlanId;
  const officerCanView =
    membership.organizations?.officer_can_view_own_reports ?? true;

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!report) notFound();

  const canViewOwn =
    report.created_by === user.id &&
    (report.status === "draft" || officerCanView);
  if (!admin && !canViewOwn) {
    redirect("/reports");
  }

  const [
    incidentTypesRes,
    buildingsRes,
    unitsRes,
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
  ] = await Promise.all([
    supabase
      .from("org_incident_types")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("buildings")
      .select("*")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("building_units")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("unit_number"),
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
    supabase.from("report_answers").select("question_id, value").eq("report_id", report.id),
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
      .order("created_at", { ascending: true }),
  ]);

  const canEditDraft =
    report.status === "draft" &&
    (report.created_by === user.id || admin);
  const canReview = admin && report.status === "submitted";

  const incidentLabel =
    incidentTypesRes.data?.find((row) => row.id === report.incident_type_id)?.label ??
    "Untitled incident";
  const buildingName =
    buildingsRes.data?.find((row) => row.id === report.building_id)?.name ?? null;
  const unit = unitsRes.data?.find((row) => row.id === report.unit_id);
  const buildingRequired =
    questionsRes.data?.some(
      (question) => question.question_key === "building" && question.required
    ) ?? true;

  const amendmentAuthorIds = Array.from(
    new Set((amendmentsRes.data ?? []).map((row) => row.created_by))
  );
  const { data: amendmentAuthors } =
    amendmentAuthorIds.length > 0
      ? await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", amendmentAuthorIds)
      : { data: [] };
  const authorNames = new Map(
    (amendmentAuthors ?? []).map((person) => [
      person.id,
      person.full_name || person.email || "Someone",
    ])
  );
  const amendments = (amendmentsRes.data ?? []).map((row) => ({
    ...row,
    authorName: authorNames.get(row.created_by) ?? "Someone",
  }));

  if (canEditDraft || canReview) {
    return (
      <IntakeWizard
        report={report}
        orgId={orgId}
        userId={user.id}
        error={searchParams.error}
        incidentTypes={incidentTypesRes.data ?? []}
        buildings={buildingsRes.data ?? []}
        units={unitsRes.data ?? []}
        questions={questionsRes.data ?? []}
        options={optionsRes.data ?? []}
        conditions={conditionsRes.data ?? []}
        initialAnswers={(answersRes.data ?? []).map((row) => ({
          questionId: row.question_id,
          value: row.value,
        }))}
        agencies={agenciesRes.data ?? []}
        vehicles={vehiclesRes.data ?? []}
        people={peopleRes.data ?? []}
        damage={damageRes.data ?? null}
        media={mediaRes.data ?? []}
        videoSeconds={PLAN_LIMITS[planId].videoSeconds}
        buildingRequired={buildingRequired}
        mode={canReview ? "review" : "intake"}
        initialStep={Number(searchParams.step)}
      />
    );
  }

  return (
    <>
      {searchParams.error && (
        <div className="mx-auto mb-4 w-full max-w-2xl">
          <Alert>{searchParams.error}</Alert>
        </div>
      )}
      <ReportView
        report={report}
        incidentLabel={incidentLabel}
        buildingName={buildingName}
        unitNumber={unit?.unit_number ?? null}
        unitLabel={unit?.label ?? null}
        agencies={agenciesRes.data ?? []}
        vehicles={vehiclesRes.data ?? []}
        people={peopleRes.data ?? []}
        damage={damageRes.data ?? null}
        media={mediaRes.data ?? []}
        amendments={amendments}
        orgId={orgId}
        userId={user.id}
        videoSeconds={PLAN_LIMITS[planId].videoSeconds}
        canAmend={admin && report.status === "finalized"}
        canDelete={admin}
      />
    </>
  );
}
