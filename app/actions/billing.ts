"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { requireOwner } from "@/lib/auth";
import {
  clearOrgBilling,
  syncStripeSubscription,
} from "@/lib/billing-sync";
import {
  getAppUrl,
  getStripe,
  getStripePriceForPlan,
  isStripeConfigured,
} from "@/lib/stripe";

function billingError(message: string): never {
  redirect(`/admin/billing?error=${encodeURIComponent(message)}`);
}

async function ensureStripeCustomer(userId: string, email: string | undefined) {
  const { supabase } = await requireOwner();
  const { data: existing } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });
  const { error } = await supabase.from("billing_customers").insert({
    user_id: userId,
    stripe_customer_id: customer.id,
  });
  if (error) {
    const { data: raced } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (raced?.stripe_customer_id) return raced.stripe_customer_id;
    billingError(error.message);
  }
  return customer.id;
}

async function activeOwnerSubscription(customerId: string) {
  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });
  return (
    list.data.find((sub) =>
      ["active", "trialing", "past_due"].includes(sub.status)
    ) ?? null
  );
}

function itemForOrg(subscription: Stripe.Subscription, orgId: string) {
  return (
    subscription.items.data.find(
      (item) => item.metadata.organization_id === orgId
    ) ?? null
  );
}

export async function startPlanCheckout(formData: FormData) {
  if (!isStripeConfigured()) {
    billingError("Stripe is not configured yet.");
  }

  const plan = String(formData.get("plan") ?? "").trim();
  if (plan !== "standard" && plan !== "pro") {
    billingError("Choose Standard or Pro.");
  }

  const { supabase, user, membership } = await requireOwner();
  const orgId = membership.organization_id;
  const priceId = getStripePriceForPlan(plan);
  const customerId = await ensureStripeCustomer(user.id, user.email);
  const existing = await activeOwnerSubscription(customerId);
  const stripe = getStripe();

  if (existing?.status === "past_due") {
    billingError("Update the payment method before changing plans.");
  }

  if (existing) {
    const current = itemForOrg(existing, orgId);
    if (current) {
      await stripe.subscriptionItems.update(current.id, {
        price: priceId,
        proration_behavior: "create_prorations",
        metadata: { organization_id: orgId },
      });
    } else {
      await stripe.subscriptionItems.create({
        subscription: existing.id,
        price: priceId,
        proration_behavior: "create_prorations",
        metadata: { organization_id: orgId },
      });
    }
    const refreshed = await stripe.subscriptions.retrieve(existing.id, {
      expand: ["items.data.price"],
    });
    await syncStripeSubscription(refreshed, orgId);
    revalidatePath("/admin/billing");
    revalidatePath("/home");
    revalidatePath("/admin/settings");
    redirect("/admin/billing?success=1");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: orgId,
    success_url: `${getAppUrl()}/admin/billing?success=1`,
    cancel_url: `${getAppUrl()}/admin/billing?canceled=1`,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      organization_id: orgId,
      user_id: user.id,
      plan_id: plan,
    },
    subscription_data: {
      metadata: {
        organization_id: orgId,
        user_id: user.id,
      },
    },
  });

  if (!session.url) {
    billingError("Could not start checkout.");
  }

  await supabase.from("audit_log").insert({
    organization_id: orgId,
    user_id: user.id,
    action: "billing.checkout_started",
    new_value: { plan_id: plan },
  });

  redirect(session.url);
}

export async function openBillingPortal() {
  if (!isStripeConfigured()) {
    billingError("Stripe is not configured yet.");
  }
  const { user } = await requireOwner();
  const customerId = await ensureStripeCustomer(user.id, user.email);
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/admin/billing`,
  });
  if (!session.url) {
    billingError("Could not open the billing portal.");
  }
  redirect(session.url);
}

export async function moveOrgToFree() {
  if (!isStripeConfigured()) {
    billingError("Stripe is not configured yet.");
  }
  const { supabase, user, membership } = await requireOwner();
  const orgId = membership.organization_id;
  const { data: customer } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!customer?.stripe_customer_id) {
    await clearOrgBilling(orgId, user.id);
    redirect("/admin/billing");
  }

  const existing = await activeOwnerSubscription(customer.stripe_customer_id);
  const stripe = getStripe();
  if (existing) {
    const current = itemForOrg(existing, orgId);
    if (current) {
      await stripe.subscriptionItems.del(current.id);
    }
    const remaining = existing.items.data.filter(
      (item) => item.id !== current?.id
    );
    if (remaining.length === 0) {
      await stripe.subscriptions.cancel(existing.id);
    } else {
      const refreshed = await stripe.subscriptions.retrieve(existing.id, {
        expand: ["items.data.price"],
      });
      await syncStripeSubscription(refreshed);
    }
  }

  await clearOrgBilling(orgId, user.id);
  revalidatePath("/admin/billing");
  revalidatePath("/home");
  revalidatePath("/admin/settings");
  redirect("/admin/billing");
}
