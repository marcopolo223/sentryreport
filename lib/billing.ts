import type { SupabaseClient } from "@supabase/supabase-js";

import type { MembershipPlanId, PlanLimits } from "@/lib/plans";
import { MEMBERSHIP_PLANS, PLAN_LIMITS } from "@/lib/plans";
import type { Database, PlanId } from "@/lib/supabase/types";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type OrgBillingRow = {
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_subscription_item_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
};

export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
      return status;
    case "paused":
      return "past_due";
    default:
      return "none";
  }
}

export function effectivePlanId(
  planId: PlanId | MembershipPlanId | string | null | undefined,
  billing?: Pick<OrgBillingRow, "status" | "current_period_end"> | null
): MembershipPlanId {
  const stored =
    planId === "standard" || planId === "pro" || planId === "free"
      ? planId
      : "free";
  const status = billing?.status ?? "none";
  if (status === "unpaid" || status === "none") return "free";
  if (status === "canceled") {
    const end = billing?.current_period_end
      ? new Date(billing.current_period_end).getTime()
      : 0;
    if (end > Date.now()) return stored;
    return "free";
  }
  return stored;
}

export function getOrgPlanLimits(
  planId: PlanId | MembershipPlanId | string | null | undefined,
  billing?: Pick<OrgBillingRow, "status" | "current_period_end"> | null
): PlanLimits {
  return PLAN_LIMITS[effectivePlanId(planId, billing)];
}

export function billingStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    default:
      return "Free";
  }
}

export function planLabel(planId: MembershipPlanId) {
  return MEMBERSHIP_PLANS.find((plan) => plan.id === planId)?.name ?? "Free";
}

export function needsPaymentAttention(status: SubscriptionStatus) {
  return status === "past_due" || status === "unpaid";
}

export function formatBillingDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function organizationDeleteBlock(
  billing?: Pick<OrgBillingRow, "status" | "current_period_end"> | null
): { blocked: true; waitUntil: string | null; message: string } | { blocked: false } {
  const status = billing?.status ?? "none";
  const waitUntil = formatBillingDate(billing?.current_period_end);

  if (status === "trialing" || status === "active" || status === "past_due") {
    return {
      blocked: true,
      waitUntil: billing?.current_period_end ?? null,
      message: waitUntil
        ? `This property has a paid subscription. Cancel it on Billing, then wait until ${waitUntil} to delete it.`
        : "This property has a paid subscription. Cancel it on Billing and wait until the current period ends to delete it.",
    };
  }

  if (status === "canceled") {
    const end = billing?.current_period_end
      ? new Date(billing.current_period_end).getTime()
      : 0;
    if (end > Date.now()) {
      return {
        blocked: true,
        waitUntil: billing?.current_period_end ?? null,
        message: waitUntil
          ? `This property stays on the paid plan until ${waitUntil}. You can delete it after that.`
          : "This property is still in a paid period. You can delete it after that period ends.",
      };
    }
  }

  return { blocked: false };
}

export async function loadEffectivePlan(
  supabase: SupabaseClient<Database>,
  orgId: string,
  planId: PlanId | MembershipPlanId | string | null | undefined
) {
  const { data: billing } = await supabase
    .from("org_billing")
    .select("status, current_period_end")
    .eq("organization_id", orgId)
    .maybeSingle();

  return {
    billing,
    planId: effectivePlanId(planId, billing),
    limits: getOrgPlanLimits(planId, billing),
  };
}
