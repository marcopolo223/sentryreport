import type Stripe from "stripe";

import {
  effectivePlanId,
  mapStripeStatus,
  type OrgBillingRow,
  type SubscriptionStatus,
} from "@/lib/billing";
import { PLAN_LIMITS, type MembershipPlanId } from "@/lib/plans";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  getStripe,
  invoiceSubscriptionId,
  planFromStripePrice,
} from "@/lib/stripe";
import type { Json, PlanId } from "@/lib/supabase/types";

function priceIdOf(item: Stripe.SubscriptionItem) {
  return typeof item.price === "string" ? item.price : item.price.id;
}

function periodEndIso(item: Stripe.SubscriptionItem) {
  return new Date(item.current_period_end * 1000).toISOString();
}

async function auditBilling(
  organizationId: string,
  userId: string | null,
  action: string,
  previousValue: Json,
  newValue: Json
) {
  const supabase = createServiceClient();
  await supabase.from("audit_log").insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    previous_value: previousValue,
    new_value: newValue,
  });
}

export async function writeOrgBilling(
  organizationId: string,
  patch: {
    status: SubscriptionStatus;
    planId: MembershipPlanId;
    stripeSubscriptionId: string | null;
    stripeSubscriptionItemId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: string | null;
    actorUserId?: string | null;
  }
) {
  const supabase = createServiceClient();
  const [{ data: org }, { data: billing }] = await Promise.all([
    supabase
      .from("organizations")
      .select("plan_id")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("org_billing")
      .select(
        "status, stripe_subscription_id, stripe_subscription_item_id, stripe_price_id, current_period_end"
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  const previousPlan = (org?.plan_id ?? "free") as PlanId;
  const previousStatus = (billing?.status ?? "none") as SubscriptionStatus;
  const nextPlan = effectivePlanId(patch.planId, {
    status: patch.status,
    current_period_end: patch.currentPeriodEnd,
  });

  await supabase.from("org_billing").upsert({
    organization_id: organizationId,
    status: patch.status,
    stripe_subscription_id: patch.stripeSubscriptionId,
    stripe_subscription_item_id: patch.stripeSubscriptionItemId,
    stripe_price_id: patch.stripePriceId,
    current_period_end: patch.currentPeriodEnd,
    updated_at: new Date().toISOString(),
  });

  if (previousPlan !== nextPlan) {
    const { error } = await supabase.rpc("apply_org_plan", {
      target_org_id: organizationId,
      new_plan: nextPlan,
    });
    if (error) throw error;
    await auditBilling(
      organizationId,
      patch.actorUserId ?? null,
      "billing.plan_changed",
      { plan_id: previousPlan },
      { plan_id: nextPlan }
    );
  }

  if (previousStatus !== patch.status) {
    await auditBilling(
      organizationId,
      patch.actorUserId ?? null,
      "billing.status_changed",
      { status: previousStatus },
      { status: patch.status }
    );
  }
}

export async function clearOrgBilling(
  organizationId: string,
  actorUserId?: string | null
) {
  await writeOrgBilling(organizationId, {
    status: "none",
    planId: "free",
    stripeSubscriptionId: null,
    stripeSubscriptionItemId: null,
    stripePriceId: null,
    currentPeriodEnd: null,
    actorUserId,
  });
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackOrgId?: string | null
) {
  const paidItems = subscription.items.data.filter((item) => {
    const plan = planFromStripePrice(priceIdOf(item));
    return plan === "standard" || plan === "pro";
  });

  const matched = new Set<string>();
  const actor = subscription.metadata.user_id || null;
  const supabase = createServiceClient();

  for (const item of paidItems) {
    const priceId = priceIdOf(item);
    let orgId =
      item.metadata.organization_id ||
      subscription.metadata.organization_id ||
      fallbackOrgId ||
      null;

    if (!orgId) {
      const { data } = await supabase
        .from("org_billing")
        .select("organization_id")
        .eq("stripe_subscription_item_id", item.id)
        .maybeSingle();
      orgId = data?.organization_id ?? null;
    }

    if (!orgId) continue;
    matched.add(orgId);

    if (!item.metadata.organization_id) {
      const stripe = getStripe();
      await stripe.subscriptionItems.update(item.id, {
        metadata: { organization_id: orgId },
      });
    }

    await writeOrgBilling(orgId, {
      status: mapStripeStatus(subscription.status),
      planId: planFromStripePrice(priceId),
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: item.id,
      stripePriceId: priceId,
      currentPeriodEnd: periodEndIso(item),
      actorUserId: actor,
    });
  }

  const { data: linked } = await supabase
    .from("org_billing")
    .select("organization_id")
    .eq("stripe_subscription_id", subscription.id);

  for (const row of linked ?? []) {
    if (!matched.has(row.organization_id)) {
      await clearOrgBilling(row.organization_id, actor);
    }
  }
}

export async function addOverageToInvoice(invoice: Stripe.Invoice) {
  if (invoice.status !== "draft") return;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("org_billing")
    .select(
      "organization_id, status, current_period_end, stripe_price_id"
    )
    .eq("stripe_subscription_id", subscriptionId);

  if (!rows?.length) return;

  const stripe = getStripe();
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  for (const row of rows as (OrgBillingRow & { organization_id: string })[]) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, plan_id")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (!org) continue;

    const plan = effectivePlanId(org.plan_id, row);
    const overageCents = PLAN_LIMITS[plan].overagePerGbCents;
    if (!overageCents) continue;

    const { data: media } = await supabase
      .from("report_media")
      .select("byte_size")
      .eq("organization_id", row.organization_id);
    const used = (media ?? []).reduce(
      (sum, item) => sum + (item.byte_size ?? 0),
      0
    );
    const extra = Math.max(0, used - PLAN_LIMITS[plan].storageBytes);
    if (extra <= 0) continue;

    const gb = Math.ceil(extra / (1024 * 1024 * 1024));
    const amount = gb * overageCents;
    const description = `Storage overage · ${org.name} (${gb} GB)`;

    try {
      await stripe.invoiceItems.create(
        {
          customer: customerId,
          invoice: invoice.id,
          amount,
          currency: "usd",
          description,
        },
        { idempotencyKey: `overage:${invoice.id}:${row.organization_id}` }
      );
    } catch {
      // Invoice may already be finalized; skip rather than failing the webhook.
    }
  }
}
