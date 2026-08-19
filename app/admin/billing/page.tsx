import type { Metadata } from "next";
import Link from "next/link";

import {
  openBillingPortal,
  startPlanCheckout,
} from "@/app/actions/billing";
import { BackToOrgHome } from "@/components/back-to-org-home";
import { MoveToFreeButton } from "@/components/billing/move-to-free-button";
import { StorageMeter } from "@/components/org/storage-meter";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth";
import {
  billingStatusLabel,
  effectivePlanId,
  planLabel,
} from "@/lib/billing";
import { MEMBERSHIP_PLANS } from "@/lib/plans";
import { getIntendedPlan } from "@/lib/intended-plan";
import { isStripeConfigured } from "@/lib/stripe";
import type { SubscriptionStatus } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; canceled?: string };
}) {
  const { supabase, membership } = await requireOwner();
  const org = membership.organizations;
  if (!org) return null;

  const { data: billing } = await supabase
    .from("org_billing")
    .select(
      "status, stripe_subscription_id, current_period_end, stripe_price_id"
    )
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const { data: mediaRows } = await supabase
    .from("report_media")
    .select("byte_size")
    .eq("organization_id", membership.organization_id);

  const usedBytes = (mediaRows ?? []).reduce(
    (sum, row) => sum + (row.byte_size ?? 0),
    0
  );

  const status = (billing?.status ?? "none") as SubscriptionStatus;
  const planId = effectivePlanId(org.plan_id, billing);
  const configured = isStripeConfigured();
  const intendedPlan = getIntendedPlan();
  const periodEnd = billing?.current_period_end
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(billing.current_period_end))
    : null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <BackToOrgHome />
        <h1 className="mt-3">Billing</h1>
        <p className="page-lead">
          Plan, payment, and media storage for this property. Other properties
          you own share the same Stripe customer.
        </p>
      </div>

      {searchParams.error && <Alert>{searchParams.error}</Alert>}
      {searchParams.success && (
        <Alert variant="info">Plan updated. Stripe remains the source of truth.</Alert>
      )}
      {searchParams.canceled && (
        <Alert variant="info">Checkout was canceled. Nothing changed.</Alert>
      )}
      {intendedPlan && intendedPlan !== planId && (
        <Alert variant="info">
          You chose {intendedPlan === "pro" ? "Pro" : "Standard"} when you signed
          up. Upgrade this property below when you are ready.
        </Alert>
      )}
      {!configured && (
        <Alert variant="info">
          Stripe keys are not configured. Add them to .env.local to enable
          upgrades.
        </Alert>
      )}

      <WindowFrame
        title="Current plan"
        trailing={
          <Badge variant={status === "past_due" || status === "unpaid" ? "warning" : "pending"}>
            {billingStatusLabel(status)}
          </Badge>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-2xl font-semibold tracking-tight">{planLabel(planId)}</p>
          {periodEnd && status !== "none" && (
            <p className="text-sm text-muted-foreground">
              Current period ends {periodEnd}.
            </p>
          )}
          {configured && (
            <div className="flex flex-wrap gap-2">
              <form action={openBillingPortal}>
                <Button type="submit" variant="outline">
                  Manage payment method
                </Button>
              </form>
              {planId !== "free" && <MoveToFreeButton />}
            </div>
          )}
        </div>
      </WindowFrame>

      <WindowFrame title="Media storage">
        <StorageMeter usedBytes={usedBytes} planId={planId} />
      </WindowFrame>

      <div className="grid gap-4 md:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan) => {
          const current = plan.id === planId;
          return (
            <WindowFrame
              key={plan.id}
              title={plan.name}
              trailing={
                current ? <Badge variant="success">Current</Badge> : undefined
              }
            >
              <div className="flex h-full flex-col p-4">
                <p className="text-lg font-semibold tracking-tight">
                  {plan.priceLabel}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.id !== "free" && configured && !current && (
                  <form action={startPlanCheckout} className="mt-4">
                    <input type="hidden" name="plan" value={plan.id} />
                    <Button type="submit" className="w-full">
                      {planId === "free" ? "Upgrade" : "Switch"} to {plan.name}
                    </Button>
                  </form>
                )}
                {plan.id === "free" && current && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Included with every organization.
                  </p>
                )}
              </div>
            </WindowFrame>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Payment methods, invoices, and cancellations for the Owner account are
        handled in the{" "}
        <Link href="https://stripe.com/docs/customer-management" className="underline">
          Stripe Customer Portal
        </Link>
        . Use Manage payment method above.
      </p>
    </div>
  );
}
