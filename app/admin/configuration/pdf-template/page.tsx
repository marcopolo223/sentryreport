import Link from "next/link";

import { PdfTemplateBuilder } from "@/components/admin/pdf-template-builder";
import { BackToOrgHome } from "@/components/back-to-org-home";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { loadEffectivePlan } from "@/lib/billing";
import { generateDefaultLayout } from "@/lib/pdf/layout";
import { parsePdfLayout } from "@/lib/pdf/types";
import { isOwnerRole } from "@/lib/permissions";

export default async function PdfTemplatePage({
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
          <h1 className="mt-3">PDF template</h1>
          <p className="page-lead">
            Custom PDF layouts are included on Standard and Pro. Free always
            uses the default incident form.
          </p>
        </div>
        <WindowFrame title="Standard or Pro">
          <div className="space-y-3 p-4">
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

  const [questionsRes, optionsRes, templateRes] = await Promise.all([
    supabase
      .from("org_questions")
      .select("id, question_key, label, field_type")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("org_question_options")
      .select("question_id")
      .eq("organization_id", orgId),
    supabase
      .from("pdf_templates")
      .select("layout")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  const optionCounts = new Map<string, number>();
  const keyById = new Map(
    (questionsRes.data ?? []).map((question) => [question.id, question.question_key])
  );
  for (const row of optionsRes.data ?? []) {
    const key = keyById.get(row.question_id);
    if (!key) continue;
    optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
  }

  const questions = (questionsRes.data ?? []).map((question) => ({
    question_key: question.question_key,
    label: question.label,
    field_type: question.field_type,
    optionCount: optionCounts.get(question.question_key) ?? 0,
  }));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <BackToOrgHome href="/admin/configuration" />
        <h1 className="mt-3">PDF template</h1>
        <p className="page-lead">
          Drag and resize fields on the page. Configure intake first so this
          canvas is pre-filled from your questions.{" "}
          <Link
            href="/admin/configuration/intake"
            className="font-medium text-primary hover:underline"
          >
            Open intake
          </Link>
        </p>
      </div>
      {searchParams.error && <Alert>{searchParams.error}</Alert>}
      <PdfTemplateBuilder
        questions={questions}
        initialLayout={
          parsePdfLayout(templateRes.data?.layout ?? null) ??
          generateDefaultLayout(questions)
        }
        hasSavedTemplate={Boolean(templateRes.data)}
      />
    </div>
  );
}
