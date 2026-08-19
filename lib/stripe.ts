import Stripe from "stripe";

import { getAppUrl } from "@/lib/app-url";

export { getAppUrl };

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_STANDARD &&
      process.env.STRIPE_PRICE_PRO
  );
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

export function getStripePriceForPlan(plan: "standard" | "pro") {
  const priceId =
    plan === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_STANDARD;
  if (!priceId) {
    throw new Error(
      plan === "pro"
        ? "STRIPE_PRICE_PRO is not configured"
        : "STRIPE_PRICE_STANDARD is not configured"
    );
  }
  return priceId;
}

export function planFromStripePrice(priceId: string | null | undefined) {
  if (!priceId) return "free" as const;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro" as const;
  if (priceId === process.env.STRIPE_PRICE_STANDARD) return "standard" as const;
  return "free" as const;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}
