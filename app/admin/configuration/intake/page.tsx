import Link from "next/link";

import { QuestionBuilder } from "@/components/admin/question-builder";
import { BackToOrgHome } from "@/components/back-to-org-home";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import { isOwnerRole } from "@/lib/permissions";

export default async function IntakeBuilderPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, membership } = await requireAdmin();
  const orgId = membership.organization_id;
  const { limits } = await loadEffectivePlan(
    supabase,
    orgId,
    membership.organizations?.plan_id
  );

  if (!limits.builders) {
    return (
      <div className="min-w-0 space-y-6">
        <div>
          <BackToOrgHome href="/admin/configuration" />
          <h1 className="mt-3">Intake questions</h1>
          <p className="page-lead">
            Custom questions and conditionals are included on Standard and Pro.
          </p>
        </div>
        <WindowFrame title="Standard or Pro">
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Free keeps the default intake. Upgrade to add, reorder, and
              condition your own questions. Existing reports keep their answers.
            </p>
            {isOwnerRole(membership.role) ? (
              <Button asChild>
                <Link href="/admin/billing">View billing</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask the owner to upgrade this property.
              </p>
            )}
          </div>
        </WindowFrame>
      </div>
    );
  }

  const [typesRes, questionsRes, optionsRes, conditionsRes] = await Promise.all([
    supabase
      .from("org_incident_types")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order"),
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
  ]);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <BackToOrgHome href="/admin/configuration" />
        <h1 className="mt-3">Intake questions</h1>
        <p className="page-lead">
          Default fields stay on every report. Custom questions show in intake
          and on the PDF. Changing a type or its options versions the question
          so old answers stay valid.
        </p>
      </div>
      {searchParams.error && <Alert>{searchParams.error}</Alert>}
      <QuestionBuilder
        incidentTypes={typesRes.data ?? []}
        questions={questionsRes.data ?? []}
        options={optionsRes.data ?? []}
        conditions={conditionsRes.data ?? []}
      />
    </div>
  );
}
